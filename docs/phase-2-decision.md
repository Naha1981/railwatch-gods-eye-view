# RailWatch — Phase 2/3 Decision Summary

This ties together `vision-decision.md`, `photogrammetry-decision.md`, and
`compute-architecture.md` into one place. No code was changed and nothing
was installed or deployed as part of this document.

## VERIFIED FACTS (cross-cutting)

- Render has no GPU instance type — verified directly against Render's own
  pricing page. This alone rules out Meshroom (GPU-required for full
  quality) and any GPU-dependent vision model, on Render specifically.
- OpenDroneMap's own guidance (128 GB RAM for 2,500 images) means realistic
  photogrammetry compute cannot live inside the existing web process or a
  standard Render web service tier — it needs its own host, sized to actual
  job volume.
- Ultralytics YOLO's AGPL-3.0-vs-Enterprise-License split is a real decision
  point for a commercial product, not a detail to wave past.
- Apache-2.0 (Detectron2, YOLOX) and MIT (ONNX Runtime) give a fully
  permissive path with no licensing decision required before shipping.

## ASSUMPTIONS

- No specific customer has yet demanded 3D evidence or AI defect detection —
  both remain valuable roadmap items, not urgent blockers, unless that's
  changed since the last conversation.
- Budget for external compute (photogrammetry worker) has not been set — the
  cost ranges in `compute-architecture.md` are shapes, not commitments.

## RECOMMENDATION

1. **Vision AI:** Apache-2.0 detector (YOLOX or Detectron2, final pick at
   implementation time) → ONNX → ONNX Runtime (CPU) → FastAPI endpoint →
   `visionAdapter.js`. Everything returned is `evidence_state: "DERIVED"`.
2. **Photogrammetry:** OpenDroneMap via NodeODM, run on a separate worker
   host (not Render, not the web process), Redis-backed job queue,
   `content_hash` + `evidence_state: "DERIVED"` on outputs, results in
   Cloudflare R2, displayed in the existing Cesium environment.
3. **Compute:** Option A (free/local) now, Option B (small dedicated worker
   VM + Render for the app) at first production deployment. Option C only
   once real volume data exists.

## WHY

Both recommendations are the ones that (a) have verifiable licenses and
capabilities, (b) run without a GPU, which this deployment target doesn't
have, and (c) sit cleanly behind the adapter interfaces already scaffolded
in `src/integrations/` — so neither choice requires touching RailWatch's
core application code to swap later, per rule #9.

## TRADE-OFFS

- Neither recommendation gives railway-specific defect detection or
  benchmarked photogrammetry processing times out of the box — both need
  further, separately-scoped work (custom model training; a real hardware
  benchmark) that this pass deliberately did not attempt.
- The photogrammetry worker is new infrastructure to operate, not just new
  code — that's an ongoing operational cost (time, not just money) worth
  being honest about before committing to it.

## IMPLEMENTATION PLAN

See the "Implementation plan" sections of `vision-decision.md` and
`photogrammetry-decision.md` for the step-by-step sequences. Nothing in
either sequence starts until you say so.

## WHAT NOT TO BUILD YET

- No vision model training, no GPU provisioning, no photogrammetry worker
  deployment, no object storage account created, no dependencies installed,
  no application code changed. Everything in this pass is documentation.

## Open decisions still needed from you before Phase 2/3 code starts

1. YOLOX vs Detectron2 (or: pay for Ultralytics Enterprise instead) — pick
   one, or ask for a deeper side-by-side if neither is obviously right
2. Where the NodeODM worker actually runs (which VPS/cloud provider) and
   what budget it has
3. Whether Cloudflare R2 is an acceptable object-storage choice, or if
   there's a preferred provider already in use elsewhere at NahaLabs
