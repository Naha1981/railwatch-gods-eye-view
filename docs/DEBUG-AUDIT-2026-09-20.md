# DEBUG & SECURITY AUDIT

Updated: September 20, 2026
Scope: full repo at commit `614f37db1c776fc39b01b6e484d183ea2a05f130` (main, tip as of this audit)
Method: clone, `npm install`, `npm run build`, `npm test` (2,710 JS tests), Python backend test suite (isolated per file and combined, as CI's `unittest discover` runs it), `npm audit`, direct reproduction of the rules engine, and source review of `railwatch/backend/`, `vite.config.js`, `render.yaml`, `SECURITY.md`, `RAILWATCH-MVP.md`.

**Resolution update (same day):** every item below marked Fixed has a corresponding code change in this commit, verified by re-running the full JS suite (2,709/2,709 pass) and the full Python `unittest discover` combined suite (21/21 pass) — not just re-reading the code. Three additional bugs, found only while verifying the fixes below, are recorded at the end of this file. This audit stays in the repo as a record of what was found and fixed, not as a list of open items — check the Status line on each entry rather than assuming anything below is still outstanding.

This file supplements `KNOWN-ISSUES.md` (frontend runtime issues) and `RAILWATCH-MVP.md` (the "Council verdict" self-review) with findings verified against the current codebase, not design review.

---

## Critical

### Incident severity comparison is broken — escalation rules never fire as CRITICAL
Status: **Fixed.** `str(Severity.CRITICAL)` produced `"Severity.CRITICAL"` instead of `"CRITICAL"`, so `critical_breach` and the `SLA_SECONDS` lookup both silently failed for every real incident — every CRITICAL/LINE_BREACH event got `"STANDARD"` escalation and the 300s INFO-level SLA instead of `"IMMEDIATE"` and the 30s CRITICAL SLA. Fixed via a shared `_normalize_severity()` helper in `operations.py` that reads `.value` when present instead of blind `str()`, applied at both call sites (`_rule_evaluation()` and `_incident_record()`'s SLA lookup).
File: `railwatch/backend/operations.py`

---

## High — CI is almost certainly red on `main`

### JS unit tests: 1 of 2,710 failing
Status: **Fixed.** `controlRoomStatusRegression.test.mjs` regex-matched a stale 2-parameter `updateStage` signature; `updateStage` gained a third `announce` parameter in `01378a1` and the test wasn't updated. Test now matches the current 3-parameter signature and call sites.
File: `src/controlRoomStatusRegression.test.mjs`

### Python backend tests: broken for three independent, stacked reasons
Status: **Fixed**, all three, plus a fourth cause found only after fixing the first three (see bottom of this file).

1. **Missing test dependency** — `httpx` added to `requirements.txt`.
2. **`operations.install()` had no reentry guard** — added the same `app.state` guard its sibling installers (`generic_telemetry.install`, `whatsapp_integration`'s installer) already used.
3. **`main.DEMO_MODE` was frozen at first import** — converted to `_demo_mode()`, read live on every call.
4. **Real logic failure once the above were fixed** — `test_operations.py::test_sla_replay_and_rules_require_operator_scope`'s `'STANDARD' != 'IMMEDIATE'` was the Critical finding above, surfacing through the test suite. Fixed by the same `_normalize_severity()` change.

---

## Medium — security & production-readiness

### `render.yaml` hardcodes demo mode for the only deployed service
Status: **Fixed.** Changed from `value: "true"` to `sync: false` — must now be set explicitly per environment rather than defaulting on.

### Demo endpoint rate limiting is global, not per-caller
Status: **Fixed.** `/api/v1/demo/line-breach`'s rate guard is now keyed per client IP instead of a single process-wide counter.

### Incident/audit/replay-nonce state is in-process memory
Status: **Open — not a code-level fix.** Durable only if `DATABASE_URL` is set and `incident_persistence`/`audit_persistence` install successfully. This is a real architecture decision (default-on durable state vs. the current opt-in), not a bug fix, and wasn't attempted here.

### Startup-hook wiring is order- and name-dependent across five files
Status: **Open, unchanged.** `event_store.py`'s `EventStore._bootstrap_operations()` still reaches into `sys.modules.get("main")`. Works today; still fragile to a future rename or reorder. Not touched in this pass.

---

## Low — dependency & environment hygiene

- `npm audit`: **Partially fixed** — `npm audit fix` resolved 6 of 11 (down to 5 remaining: extract-zip/puppeteer chain and sharp, both need a breaking major-version bump). Not forced, since I can't verify the puppeteer-based QA scripts still work after a major bump in this environment.
- Node engine mismatch — **not changed**, informational only.
- Puppeteer forced Chrome download — **not changed**; `PUPPETEER_SKIP_DOWNLOAD=true` remains a workaround, not applied as a default in this pass.

---

## Low — code health / maintainability

- `vite.config.js` size/structure — **not touched**, too large a change for this pass.
- No ESLint/TypeScript — **not touched**.
- Bundle size — **not touched**; build still warns on chunks over 1.5MB.

---

## Note — licensing, given commercial intent

Unchanged from the original audit — still worth a look before this is sold to a customer. Not a code fix.

---

## Additional findings from verifying the fixes above

These were found only by actually re-running the combined suite after the fixes above, not by reading code:

### `test_main.py` used pytest-style bare functions, never collected by CI
`python -m unittest discover` (what `ci.yml` actually runs) only collects `unittest.TestCase` subclasses. `test_main.py`'s three tests (`test_healthz`, `test_ingest_requires_auth`, `test_ingest_accepts_and_deduplicates`) were bare `def test_...():` functions — CI reported 0 tests from this file and nobody noticed. **Fixed**: converted to a `TestCase` class.

### `test_whatsapp_integration.py` leaked `RAILWATCH_DEFAULT_TENANT` into every other test file
`unittest discover` imports every test file (running top-level code) during collection, before any test method anywhere runs. This file set `RAILWATCH_DEFAULT_TENANT` unconditionally at module level with no cleanup, which silently changed the effective tenant for `test_operations.py`'s tenant-isolation tests when run combined (they passed in isolation, failed combined — the actual cause, not the reentry-guard issue above). **Fixed**: moved to `setUpModule()`/`tearDownModule()`, which unittest calls immediately before/after *this module's* own tests specifically, not at collection time.

### `RailWatchWhatsApp.enabled`/`.auto_alerts` were frozen at singleton construction — same anti-pattern as the `DEMO_MODE` bug, third occurrence
The WhatsApp service is a per-app singleton (`app.state.railwatch_whatsapp`) constructed on the first ASGI startup anywhere in the process. `self.enabled`/`self.auto_alerts` were plain attributes set once in `__init__`, so whichever test file happened to trigger the first `TestClient(app)` entry froze these flags for the rest of the process — `test_whatsapp_integration.py`'s own tests then ran against a service that was permanently "disabled" because some earlier, unrelated test file's startup had constructed it first. **Fixed**: converted both to `@property` methods that read the env var live on every access.

### `main_persistent.py` — dead code that silently hijacked the entire telemetry pipeline on import
This module (referenced nowhere except its own test file — not by `main.py`, not by `render.yaml`'s `uvicorn main:app` entrypoint, not by any doc) unconditionally overwrote `main._store_and_broadcast` with its own hand-rolled, out-of-sync reimplementation the instant it was imported — no function call, no guard, a bare module-level assignment. Its payload builder predates the `integration_metadata` field entirely. Because `operations.install()` captures `main._store_and_broadcast` as its "original" at wrap time, this meant every telemetry event ingested anywhere in the combined test run — after this dead module happened to be imported — silently lost its integration metadata, which is what `test_generic_telemetry.py`'s two failures actually were. `test_event_store.py` already covers the same `EventStore` behavior this module claimed to test, correctly, using `patch.dict(os.environ, ..., clear=False)`. **Fixed**: deleted `main_persistent.py` and `test_main_persistent.py`. Has zero effect on the deployed app.

