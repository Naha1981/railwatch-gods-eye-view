# RailShield — Phase Decisions (APPROVED)

This ties together `vision-decision.md`, `photogrammetry-decision.md`, and
`compute-architecture.md` into one place. The three decisions below are
**locked** as of 2026-09-20. No code was changed, no dependencies were
installed, no infrastructure was provisioned, and nothing was deployed as
part of recording these decisions — this remains an architecture/decision
document.

## APPROVED DECISIONS

### 1. Vision AI → YOLOX + ONNX Runtime

- Detector: **YOLOX** (Apache-2.0) — chosen specifically because it avoids
  the Ultralytics YOLO AGPL-3.0-vs-Enterprise-License question entirely.
  Detectron2 (also Apache-2.0) is no longer the open alternative under
  consideration; YOLOX is the pick.
- Served through **ONNX Runtime** (MIT, CPU-capable) — model exported to
  ONNX, no GPU dependency.
- Stays behind a **`VisionProvider` adapter interface** so the underlying
  model can be replaced later without touching call sites — this is a
  naming lock-in: the adapter class RailShield code talks to is
  `VisionProvider`, with YOLOX/ONNX Runtime as its first (and currently
  only) implementation.
- **Railway-specific defect detection is explicitly not claimed.** YOLOX
  out of the box gives general object detection (people, vehicles, generic
  objects) — not fishplate cracks, ballast degradation, or fastener loss.
  Custom railway-model training/evaluation is its own future phase (Phase 3
  below), not bundled into this decision.

### 2. Photogrammetry → architecture locked, production worker deferred

- Engine: **NodeODM/OpenDroneMap**, called via its REST API — this choice
  is locked and documented, but **no worker is deployed.**
- ODM does **not** run inside the Render web service, now or later — that
  was already ruled out by RAM requirements and is reconfirmed here.
- **No infrastructure purchased yet.** No VM, no dedicated host, nothing
  provisioned.
- Early testing path: **local/offline processing** (a developer machine
  running NodeODM via Docker for small test image sets), consistent with
  Option A in `compute-architecture.md`.
- Trigger for standing up a real worker: **the first production customer
  that actually requires photogrammetry** — not before.
- The worker design stays **provider-agnostic** — no specific VPS/cloud
  vendor is chosen in this decision; that choice happens at deployment time,
  against whatever's cheapest/best-fit then.

### 3. Object storage → Cloudflare R2 (provisional)

- R2 is the **provisional** target for large evidence/media/3D artifacts
  (photogrammetry outputs, evidence video, large imagery) — chosen for its
  no-egress-fee pricing model, verified earlier in
  `compute-architecture.md`.
- Stays behind a **storage adapter** so it can be swapped for another
  provider later without touching call sites.
- **No R2 bucket or account is created now.** It gets provisioned only when
  the current phase actually needs it (i.e., alongside the photogrammetry
  worker or evidence-video pipeline that would use it) — not as part of
  this decision-recording step.

## VERIFIED FACTS (cross-cutting, carried over)

- Render has no GPU instance type — verified directly against Render's own
  pricing page. Rules out any GPU-dependent path on Render specifically.
- OpenDroneMap's own guidance (128 GB RAM for 2,500 images) is why the
  photogrammetry worker can't live in the web process or a standard Render
  tier — this is what makes "defer the worker" the responsible default
  rather than a shortcut.
- Ultralytics YOLO's AGPL-3.0-vs-Enterprise-License split is why YOLOX
  (Apache-2.0) was chosen over it.
- Cloudflare R2's $0.015/GB-month standard storage with no egress fee was
  the deciding figure for the provisional storage pick (see
  `compute-architecture.md` for sourcing and the caveat that this wasn't
  fetched directly from Cloudflare's own pricing page and should be
  re-verified before any spend commitment).

## WHY

Every one of these three picks sits behind an adapter interface already
scaffolded in `src/integrations/` (or named for one, in the case of
`VisionProvider`) — so none of them lock RailShield's core application code
to a specific vendor. That's what makes it safe to defer the two pieces
(worker, bucket) that cost real money without blocking the two pieces
(adapter design, model choice) that don't.

## TRADE-OFFS

- Deferring the photogrammetry worker means no photogrammetry capability
  exists for a customer until one is actually deployed — that's a real lead
  time to plan for once a customer needs it, not an instant flip.
- YOLOX's general-purpose detection will not read as "railway AI" to a
  prospect who assumes defect detection is already trained — the
  `evidence_state: "DERIVED"` labeling and the Phase 3 split below exist
  specifically so that gap isn't papered over in a demo or a sales
  conversation.
- R2 being "provisional" means a second storage-provider evaluation could
  still happen later — that's intentional, not a gap to close now.

## PHASED IMPLEMENTATION PLAN

```
PHASE 1
  Existing RailShield system
  + VisionProvider interface
  + YOLOX/ONNX Runtime design
    (adapter + model choice locked; no dependencies installed yet,
     no production code changed yet — see implementation plan in
     vision-decision.md for the actual build steps when greenlit)

PHASE 2
  Separate photogrammetry worker architecture
  + NodeODM/OpenDroneMap adapter
  + R2 object storage
    (architecture documented and adapter-shaped; worker deployment and
     R2 bucket creation both wait for the first production customer that
     needs them — see photogrammetry-decision.md)

PHASE 3
  Railway-specific model training/evaluation
    (a dataset decision and training effort in its own right, deliberately
     separated from Phase 1's general-purpose YOLOX baseline — not started,
     not scoped in detail yet)
```

## WHAT NOT TO BUILD YET

- No dependencies installed (YOLOX, ONNX Runtime, or otherwise)
- No production code modified
- No NodeODM/photogrammetry worker deployed
- No VM or other compute provisioned
- No Cloudflare R2 bucket or account created
- No railway-specific model training started

This document records decisions only. The next action on any of the three
items above requires an explicit go-ahead.
