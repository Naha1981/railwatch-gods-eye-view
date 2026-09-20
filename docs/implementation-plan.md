# RailShield — Implementation Plan

Reflects the approved decisions in `docs/phase-2-decision.md`. Nothing in
this document has been built — it's the sequence to follow once each phase
is greenlit. No dependencies installed, no production code modified, no
infrastructure provisioned as part of writing this plan.

## PHASE 1

```
Existing RailShield system
  + VisionProvider interface
  + YOLOX/ONNX Runtime design
```

- **Existing RailShield system:** unchanged — the Cesium/God's Eye View
  foundation, FastAPI backend, evidence ledger, telemetry ingest, WhatsApp
  operations, all as audited in `docs/architecture.md`. Nothing here is
  being rewritten.
- **`VisionProvider` interface:** the adapter contract RailShield's own code
  will call — `src/integrations/visionAdapter.js` is the scaffolded seam for
  this; the class inside it should be named `VisionProvider` to match the
  locked decision. Its structured result shape (asset, image/video,
  timestamp, GPS, detected_object, class, confidence, bounding_box,
  segmentation, model, model_version, inference_timestamp,
  `evidence_state: "DERIVED"`) is documented in `docs/vision-decision.md`
  and does not change here.
- **YOLOX/ONNX Runtime design:** YOLOX (Apache-2.0) exported to ONNX,
  served via ONNX Runtime (MIT, CPU) behind `VisionProvider`, called from a
  new FastAPI endpoint. Design only in this phase — see "What this phase
  does NOT include" below for what's still gated.
- **Also cleared to proceed independently (no new decision needed):**
  evidence-video generation via `ffmpeg` behind
  `evidenceVideoAdapter.js` — this was already scoped in an earlier pass
  and isn't blocked by anything in this document. Its licensing boundary is
  now locked: **LGPL-compatible build only — no `--enable-gpl`, no
  `--enable-nonfree`, no `libx264`/`libx265`** (see the dedicated ffmpeg
  entry in `docs/integrations.md`). Sequencing it is a separate call from the
  vision/photogrammetry decisions above.

**What this phase does NOT include:** installing YOLOX/ONNX Runtime,
exporting a model, writing `railwatch/backend/vision_analysis.py`, or
touching `main.py`'s incident contract. Those are real build steps that
happen once Phase 1 is explicitly greenlit for implementation — this
section is the locked design, not the build.

## PHASE 2

```
Separate photogrammetry worker architecture
  + NodeODM/OpenDroneMap adapter
  + R2 object storage
```

- **Separate photogrammetry worker architecture:** documented in
  `docs/photogrammetry-decision.md` — a standalone host running NodeODM,
  never inside the Render web service, provider-agnostic (no VPS/cloud
  vendor chosen yet).
- **NodeODM/OpenDroneMap adapter:** `src/integrations/photogrammetryAdapter.js`
  is the scaffolded seam; wiring it to a real `POST .../photogrammetry-job`
  + `GET .../{job_id}` pair happens only once a worker actually exists.
- **R2 object storage:** Cloudflare R2 as the provisional target for large
  evidence/media/3D artifacts, kept behind a storage adapter (not yet
  created in `src/integrations/` — add it when this phase starts) so the
  provider can change later without touching call sites.

**Trigger to start building this phase:** the first production customer
that actually requires photogrammetry. Not before.

**What this phase does NOT include:** provisioning a VM, deploying NodeODM
anywhere, creating an R2 bucket or account, or writing
`railwatch/backend/photogrammetry_jobs.py`. Early testing in the meantime
uses local/offline NodeODM via Docker on a developer machine only (Option A
in `docs/compute-architecture.md`), not deployed infrastructure.

## PHASE 3

```
Railway-specific model training/evaluation
```

- A separate effort from Phase 1's general-purpose YOLOX baseline: training
  or fine-tuning a model against an actual labeled railway-defect dataset
  (fishplate cracks, ballast degradation, fastener loss, etc.).
- Needs its own dataset decision first — none has been identified or
  verified. Not scoped in detail yet; this phase exists as a placeholder so
  it's never conflated with Phase 1's general object detection.
- `VisionProvider`'s adapter design (Phase 1) is what makes this phase
  possible without a rewrite later: swapping in a trained railway model
  means replacing what's behind the adapter, not changing how RailShield
  calls it.

## Evidence-state extension (cuts across Phase 1 and Phase 2)

Still pending, unchanged from the earlier pass — add to the existing
incident contract in `railwatch/backend/main.py` once either phase starts
touching the backend:
- `evidence_state: Literal["VERIFIED","DERIVED","INFERRED","DISPUTED","UNKNOWN"]`
- `content_hash: str` (SHA-256) on any `media_url`-bearing record

Additive only — safe defaults (`evidence_state` default `"UNKNOWN"`,
`content_hash` optional), no breaking change to
`TelemetryBreachAlert`/`IncidentContext`.

## Risks (overall, carried over)

- **Exposed credential:** a GitHub token was shared in plaintext earlier in
  this project's session history — it should be rotated if that hasn't
  happened yet, independent of anything else in this plan.
- Phase 2's cost is the main open budget question, and is deliberately
  deferred until a paying customer justifies it.
- Phase 3 needs a dataset decision before it can be scoped further.

## What was implemented this pass

Nothing. This is a planning document update only — no dependencies
installed, no production code modified, no infrastructure provisioned.
