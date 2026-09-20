# RailWatch — Implementation Plan

## Sequencing

### Phase 0 — Audit & scaffolding (this pass, complete)
- `docs/integrations.md`, `docs/architecture.md`, `docs/implementation-plan.md`
- `src/integrations/` adapter interfaces (no wiring, no new runtime deps)
- No destructive changes, no paid services, no packages installed

### Phase 1 — Evidence video (ffmpeg)
**Files to add:**
- `railwatch/backend/evidence_video.py` — subprocess wrapper around `ffmpeg`:
  clip extraction by timestamp range, burn-in overlay (event ID, GPS,
  timestamp, SHA-256 of source), concatenation into an investigation package
- `src/integrations/evidenceVideoAdapter.js` — frontend-facing interface that
  calls a new backend endpoint (e.g. `POST /api/v1/evidence/video-package`)

**Dependencies to install:** `ffmpeg` binary in the deploy environment
(system package, not a Python/npm dependency) — free, no license cost (LGPL/GPL
depending on build config; use the LGPL build to avoid GPL codecs if that
matters for distribution)

**Files to change:** `railwatch/evidence-ledger.js` (add "generate evidence
package" action), `railwatch/backend/render.yaml` (ensure ffmpeg is available
in the Render build image)

**Risk:** low. Pure addition, no existing endpoint touched.

### Phase 2 — Photogrammetry (OpenDroneMap)
**Files to add:**
- `railwatch/backend/photogrammetry_jobs.py` — job submission/status polling
  against a NodeODM instance
- Wire `src/integrations/photogrammetryAdapter.js` to a new
  `POST /api/v1/evidence/photogrammetry-job` + `GET .../{job_id}` pair

**Dependencies:** a running NodeODM instance (Docker) — this is
infrastructure, not a code dependency; needs a hosting decision before coding
starts (self-hosted container next to the FastAPI backend, or separate)

**Environment variables:** `RAILWATCH_ODM_ENDPOINT`, `RAILWATCH_ODM_API_KEY`

**Risk:** medium — compute/storage cost for reconstruction jobs; needs a
queue so large jobs don't block the request thread (Redis is already a
dependency, can back a simple job queue)

**Blocked on:** your decision on where NodeODM runs and expected image-set
sizes

### Phase 3 — Vision AI
**Blocked on:** provider selection. visualgpt.io did not verify as fit for
purpose (see integrations.md). Two real paths:
1. Self-hosted open-source detection model — no per-call cost, more setup
2. A documented vendor vision API — faster to start, ongoing cost, needs a
   decision under rule #11 ("no paid services unless absolutely necessary")

**Files to add once decided:** `railwatch/backend/vision_analysis.py`,
wire `src/integrations/visionAdapter.js`

**Risk:** low technical risk, real cost/vendor-lock decision needed first

### Deferred — Offline field capture (Meshtastic / PotatoMesh)
Not scheduled. The existing telemetry ingest + WhatsApp channel already
tolerate intermittent connectivity at the application layer (retry, queue).
A LoRa mesh layer is a hardware investment; revisit if a customer's field
sites genuinely have no cellular/WiFi at all.

## Evidence-state extension (cuts across phases)

Add to the existing incident contract in `railwatch/backend/main.py`:
- `evidence_state: Literal["VERIFIED","DERIVED","INFERRED","DISPUTED","UNKNOWN"]`
- `content_hash: str` (SHA-256) on any `media_url`-bearing record, computed at
  ingest time in the existing `/api/v1/telemetry/ingest` path

This is additive to `TelemetryBreachAlert`/`IncidentContext` — no breaking
change to the existing contract as long as the new fields have safe defaults
(`evidence_state` default `"UNKNOWN"`, `content_hash` optional).

## Risks (overall)

- **Exposed credential:** a GitHub token was shared in plaintext in this
  session to enable the clone — it should be rotated regardless of any of
  the above.
- **Photogrammetry compute cost** is the main budget unknown — needs a
  hosting decision before Phase 2 starts.
- **Vision AI vendor choice** needs a decision before Phase 3 starts —
  no vendor has been selected or contacted.
- Everything in Phase 1 is safe to build without further sign-off; Phases 2–3
  need the decisions above first.

## What was implemented this pass

- `docs/integrations.md`, `docs/architecture.md`, `docs/implementation-plan.md`
- `src/integrations/` — interface-only adapters (see file headers), not wired
  to any backend endpoint yet, so this pass has zero runtime effect on the
  running app
