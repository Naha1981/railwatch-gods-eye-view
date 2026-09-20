# RailWatch integration adapters

Each external capability RailWatch depends on lives behind a small adapter
class here, so the backing provider can change without touching call sites
in `railwatch/*.js` or `railwatch/backend/`.

| Adapter | Backing provider (planned) | Status |
|---|---|---|
| `photogrammetryAdapter.js` | OpenDroneMap / NodeODM | Interface only — Phase 2 |
| `visionAdapter.js` | Undecided — see `docs/integrations.md` | Interface only — Phase 3, provider not selected |
| `evidenceVideoAdapter.js` | ffmpeg (server-side) | Interface only — Phase 1 |

None of these are wired to a live backend endpoint yet. Calling any method on
them today throws a descriptive error rather than failing silently or
fabricating a response. See `docs/integrations.md` for the full audit and
`docs/implementation-plan.md` for sequencing.

Explicitly not implemented here, with reasons in `docs/integrations.md`:
**OpenCut** (target repo mid-rewrite, editor route unfinished) and
**ClawHub** (unrelated agent-skill marketplace, real supply-chain risk, no
fit for this stack).
