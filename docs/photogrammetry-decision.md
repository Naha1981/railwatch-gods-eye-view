# RailWatch — Photogrammetry / 3D: Decision Analysis

No decision has been implemented. This is research only.

## VERIFIED FACTS

**OpenDroneMap (ODM)**
- License: **AGPL-3.0** (confirmed via Wikipedia's OpenDroneMap entry citing
  the project, and consistent with the project's own repo licensing pattern)
- Docker support: yes, official images (`opendronemap/nodeodm`,
  `opendronemap/odm`) — this is the *recommended* install path
- CPU requirement: runs on CPU; Docker images require a 64-bit CPU with
  MMX/SSE/SSE2/SSE3/SSSE3 (any reasonably modern server CPU qualifies) — GPU
  is not required for the core pipeline
- RAM requirement: **the project's own official recommendation is 128 GB of
  memory to process 2,500 images.** Smaller image sets need proportionally
  less, but this is the vendor's own stated ceiling reference, not a
  third-party estimate — take it seriously for sizing.
- Outputs: point clouds, digital surface models, textured meshes,
  orthorectified imagery, digital elevation models — covers orthophoto,
  point cloud, and textured-model requirements
- API: **NodeODM** is a documented REST API in front of the ODM engine —
  submit a task, poll status, fetch results. This is the correct integration
  surface (not shelling into the ODM CLI directly).
- Processing time: not independently benchmarked this pass — depends
  heavily on image count/resolution and available cores; mark as
  **UNVERIFIED, needs a real benchmark on target hardware before committing
  to an SLA.**

**NodeODM**
- License: not independently re-confirmed this pass beyond it being part of
  the OpenDroneMap org (same org, reasonable to assume same/compatible
  license family, but this should be checked explicitly at implementation
  time, not assumed)

**Meshroom / AliceVision**
- License: **MPL-2.0** (confirmed)
- GPU requirement: **an NVIDIA CUDA-enabled GPU is required for full
  reconstruction quality.** Without one, only "Draft Meshing" is available —
  explicitly stated by the project itself in release notes.
- This rules Meshroom out for any GPU-less deployment target.

**Render (target deploy platform) — see compute-architecture.md for full detail**
- Render's own pricing page lists instance types up to "Pro Ultra" at 32 GB
  RAM / 8 CPU, and a "Custom" tier "up to 512 GB" via direct sales contact.
- **No GPU instance type is listed anywhere in Render's published pricing.**
  This was checked directly against Render's own pricing page content.

## ASSUMPTIONS

- RailWatch's initial photogrammetry jobs are per-incident/per-inspection
  image sets (tens to low hundreds of images), not full-corridor surveys of
  thousands of images — this keeps the 128 GB ODM guidance from being an
  immediate hard blocker, but it is real at scale.
- Outputs need to be viewable in the existing Cesium environment (3D Tiles /
  glTF / point cloud formats Cesium already supports), not just downloadable
  files.

## RECOMMENDATION

**OpenDroneMap via NodeODM, run as a separate worker — not on Render, not in
the main web process.** Meshroom is not viable without dedicated GPU
infrastructure this project doesn't have. See `compute-architecture.md` for
where the NodeODM worker should actually run.

## WHY

- ODM is the only one of the two that's realistically CPU-only.
- NodeODM's REST API is exactly the "job submit / poll status / fetch
  result" shape rule #9 (clean adapters) calls for — no need to shell out or
  embed the pipeline.
- AGPL-3.0 matters less here than it would for a library you link into your
  own binary: NodeODM is called as an independent networked service over
  HTTP, not compiled into RailWatch's own codebase. That's a materially
  different situation from bundling AGPL code — but it is still a real
  license, and this is not a legal opinion. Get that confirmed by counsel
  before production use, especially if you ever fork/modify ODM itself
  rather than just calling its API.

## TRADE-OFFS

- The 128 GB-for-2,500-images figure means large jobs need serious RAM —
  this is not a "spin up a $7/month Render service" task at scale. Small
  per-incident jobs (dozens of images) will need far less, but "far less"
  hasn't been benchmarked — treat any number here as a placeholder until
  tested.
- No processing-time SLA can be honestly given without a real benchmark on
  the actual target hardware — don't commit to a number for customers before
  that test exists.
- Running NodeODM as a separate worker means new infrastructure to operate
  (not just new code) — monitoring, updates, and cost are all new surface
  area, not just a new endpoint.

## IMPLEMENTATION PLAN (when this phase is greenlit — not now)

1. Decide the worker's actual home (see `compute-architecture.md` — Render
   is not it) — likely a separate VM or container host with real RAM
   headroom, sized after a benchmark.
2. Stand up NodeODM there via its official Docker image.
3. Add `railwatch/backend/photogrammetry_jobs.py`: submits jobs to NodeODM,
   polls status (via a Redis-backed queue since Redis is already a
   dependency), stores the result reference once complete.
4. Store outputs in external object storage (see compute-architecture.md),
   not on the web service's own disk.
5. Wire `src/integrations/photogrammetryAdapter.js` to
   `POST /api/v1/evidence/photogrammetry-job` + `GET .../{job_id}`.
6. Cesium display: 3D Tiles / point-cloud formats it already supports — this
   needs its own small research pass on which ODM output format maps
   cleanest to Cesium's existing layer system, not assumed here.
7. Evidence record: attach `content_hash` (SHA-256) and
   `evidence_state: "DERIVED"` to the resulting artifact, consistent with
   the vision AI adapter's contract.

## WHAT NOT TO BUILD YET

- No photogrammetry processing inside the FastAPI web process (explicitly
  against your instruction, and the RAM numbers alone rule it out)
- No Meshroom path (GPU dependency this deployment doesn't have)
- No processing-time guarantee to customers before a real benchmark exists
- No full-corridor survey jobs (thousands of images) until the compute
  question in compute-architecture.md is actually resolved with real
  infrastructure, not assumptions
