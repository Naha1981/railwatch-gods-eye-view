# Rail Shield — Computer Vision Integration Plan

Status: **PROPOSED — awaiting approval before implementation.**
Owner: NahaLabs engineering (Thabiso Naha)
Scope of this document: items 1–9 of the CV integration brief. No production
code is changed by this commit. Item 10 (implementation) starts only after
this plan is approved.

---

## 1. Repository audit

### 1.1 What this repository actually is

`railwatch-gods-eye-view` is a fork of the open-source **God's Eye View**
project (Cesium-based photorealistic 3D globe: live aircraft, ships,
satellites, earthquakes, weather, public CCTV browsing, voice control). The
top-level app (`index.html`, `src/`, `style.css`, `vite.config.js`) is that
general-purpose globe client.

**Rail Shield ("RailWatch") is a product built on top of that globe**, living
almost entirely in `railwatch/` (frontend overlay) and `railwatch/backend/`
(Python API). It reuses the globe's spatial/camera engine but adds its own
telemetry ingestion, incident workflow, evidence chain, and WhatsApp operator
channel. This distinction matters: **CV work belongs in the `railwatch/*`
layer, not the base globe code**, and must not disturb the aircraft/ship/sat
features that are unrelated to rail.

### 1.2 Frontend architecture (`railwatch/`)

- Plain JS modules (no framework), each an IIFE attached to `document`,
  communicating via **custom DOM events**: `railwatch:incident`,
  `railwatch:stage`, `railwatch:audit`. This is the de facto event bus.
- `app.js` — orchestrator; wires telemetry payloads to the globe camera and
  to the other modules.
- `operator-journey.js` — drives the incident lifecycle UI through the
  workflow stages `DETECT → LOCATE → VERIFY → RESPOND → RESOLVE → PROVE`.
- `evidence-ledger.js` — client-side, hash-chained (SHA-256) evidence log per
  incident case. **This is the correct place to attach CV provenance** — it
  already accepts arbitrary `(stage, kind, detail, source)` entries and
  exports a signed-looking case JSON. It is explicitly labelled demo/not an
  authoritative chain of custody, which we should keep honest as CV evidence
  is added (real hashing, still not legal chain-of-custody without a proper
  backend ledger).
- `cctv-evidence.js` — **currently a hardcoded demo video player.** It plays
  a fixed public-domain rail video regardless of which incident is opened.
  There is no real camera connection, no frame analysis, nothing computed.
  This is the single biggest gap CV can close.
- `dispatch-intelligence.js`, `incident-history.js`, `audit-feed.js`,
  `control-room-status.js`, `resolution-intelligence.js`,
  `whatsapp-operations.js` — incident queue, audit trail rendering, WhatsApp
  operator notification UI. These already consume the generic incident
  payload shape and need no changes to display CV-originated events, as long
  as CV events are shaped like existing telemetry events.

### 1.3 Backend architecture (`railwatch/backend/`, FastAPI)

- `main.py` — the core service. Defines `TelemetryBreachAlert` (the single
  canonical event schema), a `ConnectionManager` for WebSocket fan-out
  (`/ws/v1/c2-stream`), and `POST /api/v1/telemetry/line-breach` as the
  primary ingest endpoint. Every accepted event is deduplicated, hashed,
  persisted, and broadcast.
- `event_store.py` — Postgres adapter (`railwatch_events` table, `JSONB
  payload`) with an explicit in-memory fallback when `DATABASE_URL` isn't
  set. **Additive schema changes (new JSON keys) need no migration.**
- `generic_telemetry.py` — a tolerant adapter (`/api/v1/telemetry/ingest`,
  `/api/v1/telemetry/signed-ingest`) that normalizes loosely-shaped external
  payloads (many key aliases) into a `TelemetryBreachAlert`. **This is the
  natural integration point for a vision service** — it already does exactly
  the field-mapping and bounded-metadata work CV events need, with HMAC
  signed-request support for service-to-service auth.
- `operations.py` — incident state machine (six workflow stages), role model
  (`admin/controller/dispatcher/viewer`), per-severity SLA timers, HMAC
  request signing/verification, audit log, metrics counters. This is where
  a **risk/event rule engine** for CV detections should be added as a
  sibling module, not bolted onto `main.py`.
- `realtime_bus.py` — Redis pub/sub, for multi-instance WebSocket fan-out.
- `whatsapp_integration.py` / `whatsapp_operator.py` /
  `whatsapp_persistence.py` — operator notification channel over WhatsApp.
- `triton_legacy.py` / `triton_udp_bridge.py` — a legacy vendor telemetry
  protocol bridge (UDP). Not CV-related; left untouched.
- `audit_persistence.py` / `incident_persistence.py` — durable stores for
  the audit log and incident records, installed as optional adapters at
  startup (fail-soft if unavailable).
- `requirements.txt` — **fastapi, uvicorn, pydantic, psycopg, redis, httpx
  only.** No ML/vision dependency exists today. Confirms CV is a genuinely
  new capability, not a rewire of something broken.

### 1.4 Existing geospatial / telemetry / event / alert systems

- **Geospatial:** Cesium 3D globe; corridor/segment/km-marker abstraction
  with lat/lon/elevation; camera presets for cinematic zoom-to-incident;
  `mgrs`, `egm96-universal`, `satellite.js` on the base globe for grid
  references, geoid height, and orbital mechanics (used by the aircraft/sat
  layers, not rail).
- **Telemetry ingestion:** three ingest paths (`line-breach` typed,
  `ingest` generic/tolerant, `signed-ingest` HMAC-authenticated), all
  converging on one `TelemetryBreachAlert` schema, one dedupe/store/broadcast
  function (`_store_and_broadcast`).
- **Event/alert lifecycle:** DETECT → LOCATE → VERIFY → RESPOND → RESOLVE →
  PROVE, enforced in `operations.py` with SLA timers per severity
  (`CRITICAL/HIGH/WARNING/INFO`).
- **Evidence:** `evidence-ledger.js` (client) hash-chains an evidence trail
  per case; currently seeded only from UI actions and telemetry receipt, not
  from any actual visual analysis.
- **CCTV, today:** `config/cctv_sources.*.json` (Austin, Shinjuku) belongs to
  the *base globe app's* public-camera browser — unrelated to rail and
  currently empty (`[]`). `cctv-evidence.js` in `railwatch/` is a scripted
  demo video, not a live or recorded feed tied to any camera. **There is no
  real camera registry, stream ingestion, or frame analysis anywhere in this
  repository today.**

### 1.5 Where computer vision genuinely adds value

Rail Shield's own MVP document (`RAILWATCH-MVP.md`) independently names
**cable theft and vandalism** as a material, named Transnet operational
problem, and its Council verdict explicitly calls for "detect → locate →
verify" workflows fed by real telemetry/CCTV rather than a spectacle demo.
That is exactly the gap CV closes, and only that gap:

1. **Restricted-zone intrusion detection** (person/vehicle in the rail
   reserve, at a level crossing, or near signalling/cable infrastructure) —
   fixed or drone camera → detection → geofence rule → DETECT-stage event.
2. **Evidence-frame extraction for the PROVE stage** — replace the fake demo
   video with a real extracted frame/clip, with full provenance, feeding the
   existing evidence ledger unchanged.
3. **Verification support** — give an operator a bounding-box/confidence
   overlay to visually confirm an alert faster at the VERIFY stage, rather
   than requiring them to conclude cable theft/tampering from raw
   coordinates alone.
4. Anything beyond detection/tracking on existing or new camera feeds
   (forecasting, simulation) is a *separate* later phase — see §6.

### 1.6 What this explicitly is **not**

- **Not an autonomous-driving stack.** No lane detection, drivable-area
  segmentation, path planning, or vehicle control of any kind. Object
  detection and tracking only, feeding an alerting pipeline a human reviews.
- **Not a replacement for GPS/AVL/signalling telemetry.** CV augments the
  existing telemetry event model; it does not replace `line-breach` or
  generic telemetry ingestion.
- **Not a claim of certified, production rail-safety status.** Consistent
  with the existing repo's own "DEMO · NOT AUTHORITATIVE" labelling
  conventions, CV output will carry explicit state labels (§3) and is never
  presented as a confirmed incident without human verification.

---

## 2. Architecture diagram

```text
CCTV (fixed) / Drone imagery
              │
              ▼
   ┌────────────────────┐
   │ railwatch-vision    │   new service, separate process/container
   │  OpenCV ingestion   │   (RTSP/HLS/file), frame sampling
   │  YOLO (Ultralytics) │   detection [+ built-in ByteTrack tracking]
   │  Zone/rule engine   │   geofence + dwell-time + confidence gating
   │  Evidence extractor │   saves annotated frame/clip
   └─────────┬───────────┘
             │  HTTP (HMAC-signed), reuses existing contract
             ▼
   POST /api/v1/telemetry/signed-ingest   (generic_telemetry.py, existing)
             │
             ▼
   _store_and_broadcast()  →  EventStore (Postgres/JSONB, existing)
             │
             ▼
   operations.py — DETECT→LOCATE→VERIFY→RESPOND→RESOLVE→PROVE (existing)
             │
        ┌────┴─────┐
        ▼          ▼
  WebSocket    Evidence ledger (frontend, existing) — now backed by a
  broadcast    real extracted frame instead of a scripted demo video
        │
        ▼
  Rail Shield Cesium dashboard (existing, unmodified)
```

Everything below the dashed line into `_store_and_broadcast` already exists
and is reused unchanged. The vision service is additive and sits entirely
upstream of it, talking to the backend only through the existing
authenticated ingest contract.

---

## 3. Event state model (provenance requirement)

Every CV-originated record carries, at minimum: `source_camera_id`,
`timestamp` (capture) and `processing_timestamp` (inference), `frame_number`,
`model_name`, `model_version`, `class_label`, `confidence`, `bbox`,
`track_id` (if tracked), and an `evidence_frame_url`.

Every record is tagged with exactly one state, and the state — never the
raw detection — is what the dashboard and operator act on:

| State | Meaning | Who/what sets it |
|---|---|---|
| `OBSERVED` | Raw model detection on a single frame | Vision service |
| `DERIVED` | Rule engine inference across frames (e.g. dwell time in a restricted zone exceeded, or track persisted N consecutive frames above confidence threshold) | Rule engine |
| `PREDICTED` | Forecast output (delay/congestion) — **not produced by CV**, reserved for the future TimesFM phase | Forecasting service (later) |
| `ALERT` | DERIVED event crossed a severity threshold; enters the existing DETECT→PROVE workflow | Rule engine |
| `VERIFIED` | A human operator reviewed the evidence frame and confirmed it | Operator, via existing evidence-ledger UI |

A CV detection is never written to the dashboard as a confirmed incident
without passing through `ALERT` first and being explicitly opened for human
`VERIFY` — this mirrors the workflow that already exists in `operations.py`
and requires no change to that state machine, only new event producers.

---

## 4. Technology decisions

| Technology | Decision | Rationale |
|---|---|---|
| **Ultralytics YOLO** | Adopt, phase 1 | Detection engine for person/vehicle/train presence on fixed and drone feeds. Start with stock COCO-pretrained weights (`person`, `car`, `truck`, `train` classes exist out of the box); rail-specific classes (e.g. distinguishing cable-theft activity from a trackside worker) require a custom-labelled dataset and are phase 2, not promised now. |
| **OpenCV** | Adopt, phase 1 | Frame ingestion (RTSP/HLS/file), sampling-rate control, preprocessing, and evidence-frame/clip extraction. No custom CV algorithms needed beyond what OpenCV + YOLO already provide. |
| **Deep SORT** | Defer, evaluate in phase 2 | YOLO's built-in tracker (ByteTrack) is sufficient for persistent identity *within a single fixed camera stream*, which covers phase-1 use cases (zone intrusion, dwell time). Deep SORT would only be justified if/when a requirement emerges for identity handoff *across* multiple cameras along a corridor — not implementing it speculatively. |
| **TimesFM** | Defer | Requires a real historical time-series of train movement/telemetry events. Today's telemetry is demo/simulated (`/api/v1/demo/line-breach`) with no accumulated production history. Revisit once real corridors are live and producing sustained event volume. |
| **CARLA** | Defer, separate track | Explicitly not a production dependency. Recommend a standalone evaluation repo for generating synthetic dangerous-scenario footage (crossing incursions, obstacle-on-track) to stress-test the rule engine and, later, to build a labelled dataset for custom YOLO fine-tuning — decoupled from `railwatch-gods-eye-view` entirely. |

No autonomous-driving infrastructure (lane-following, drivable-area
segmentation, motion planning/control) is introduced anywhere in this plan.

---

## 5. Dependency changes

New, isolated dependency set — **not added to the existing lightweight
`requirements.txt`**, which stays free of heavy ML packages so the current
API service's footprint and cold-start time are unaffected:

```
# railwatch/vision/requirements.txt (new)
ultralytics>=8.3,<9
opencv-python-headless>=4.10,<5
numpy>=1.26,<3
pillow>=10.4
```

(`torch`/`torchvision` come in transitively via `ultralytics`.) Deep SORT
and TimesFM, if and when approved, get their own optional requirements
files rather than being folded into this one, so their much larger
dependency trees (e.g. TensorFlow-adjacent packages for TimesFM) aren't
pulled in until actually needed.

---

## 6. Database / event-schema changes

All changes are **additive** — the existing `railwatch_events.payload` is
`JSONB`, so no destructive migration of the durable event table is required.

1. **`TelemetryBreachAlert.integration_metadata`** (existing field) carries
   the CV provenance block for events that reach `ALERT`/`VERIFIED` state:
   ```json
   {
     "cv_evidence": {
       "model_name": "yolov8n", "model_version": "8.3.x",
       "source_camera_id": "YARD-CAM-04", "frame_number": 18420,
       "class_label": "person", "confidence": 0.94,
       "bbox": [x, y, w, h], "track_id": "17",
       "detection_state": "ALERT",
       "processing_timestamp": "...", "evidence_frame_url": "..."
     }
   }
   ```
   This reuses `generic_telemetry.py`'s existing bounded-metadata handling
   (12 KB cap, truncation-safe) with no code change required to accept it.

2. **New table `railwatch_vision_cameras`** — camera registry, distinct from
   the base globe's `config/cctv_sources.*.json` (which is for the
   unrelated public-camera browser feature): `camera_id`, `name`,
   `latitude`, `longitude`, `stream_url`, `zone_polygon` (GeoJSON), `active`,
   `created_at`.

3. **New table `railwatch_vision_detections`** — raw, high-volume,
   short-retention per-frame `OBSERVED` detections (rolling window, e.g. 72h),
   kept separate from `railwatch_events` so raw frame noise never floods the
   durable, operator-facing incident table. Only `DERIVED`/`ALERT` events
   graduate into `railwatch_events` via the existing ingest path.

---

## 7. API changes

All new endpoints live in a new `railwatch/backend/vision.py` adapter,
installed the same optional/fail-soft way as `generic_telemetry.py` and
`triton_legacy.py` already are in `event_store.py`'s bootstrap hook — zero
changes to `main.py` itself.

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /api/v1/vision/cameras` | Camera registry | ingest key |
| `POST /api/v1/vision/cameras` | Register/update a camera | ingest key |
| `POST /api/v1/vision/detections` | Raw `OBSERVED` batch from the vision service (short-retention table) | HMAC signed |
| *(reuse)* `POST /api/v1/telemetry/signed-ingest` | `ALERT`-state CV events, shaped as `TelemetryBreachAlert` with `cv_evidence` metadata | HMAC signed, existing |
| `GET /api/v1/vision/detections/{event_id}/evidence` | Evidence frame/clip retrieval | ingest key |

No new authentication scheme — HMAC signed-request verification already
exists in `operations.py` (`_verify_signed_request`) and is reused as-is.

---

## 8. Test strategy

Follows the repo's existing pattern (`test_main.py`, `test_operations.py`,
`test_generic_telemetry.py` — plain pytest, no framework change):

1. **Rule-engine unit tests** — synthetic detection fixtures (no camera or
   model needed): zone-intrusion geometry, dwell-time accumulation,
   confidence-threshold gating, `OBSERVED→DERIVED→ALERT` state transitions.
2. **Golden-frame regression set** — a small fixed set of labelled sample
   frames/clips (people/vehicles in and out of test zones); assert detection
   class/count/confidence stay within tolerance across model or dependency
   upgrades.
3. **Integration test** — a looped local video file stands in for RTSP;
   OpenCV → YOLO → rule engine → `POST /api/v1/telemetry/signed-ingest` →
   assert the event lands in `GET /api/v1/events` and broadcasts on
   `/ws/v1/c2-stream`, mirroring `test_main.py`'s existing WebSocket tests.
4. **False-positive review harness** — every `ALERT` an operator marks
   `VERIFIED` vs. rejected is logged; a running precision/recall figure per
   camera/zone/class is tracked (simple table, no new infra) and used to
   tune per-camera thresholds — this doubles as the ongoing model-performance
   dataset for §9.

---

## 9. Model-performance and false-positive strategy

- Ship with stock COCO-pretrained YOLO only; do not claim detection of any
  class the model wasn't actually trained on (no marketing "cable theft
  detection" until a custom-labelled model exists and is validated).
- Require **N consecutive above-threshold frames** (not one) before an
  `OBSERVED` detection is allowed to become `DERIVED`, to suppress
  single-frame false positives (birds, foliage motion, shadows, lighting
  flicker).
- **Zone geofencing per camera** so only intrusions into a defined
  restricted/track polygon can ever reach `ALERT` — this is the single
  biggest noise-reduction lever for a fixed camera's full field of view.
- `ALERT` never becomes a "confirmed incident" without a human `VERIFY` —
  enforced by routing every `ALERT` through the existing evidence-ledger UI
  and workflow stages, not by any new gate.
- Track false-positive rate per camera/zone/class over time (from the
  harness in §8.4); flag persistently noisy cameras/zones for
  threshold retuning or physical repositioning rather than silently
  suppressing their alerts.

---

## 10. Deployment requirements

- The vision service is **compute-heavy and must not share a process or
  container with the existing lightweight FastAPI service** (`render.yaml`
  today targets a small web-service instance). It runs as its own
  service/worker, decoupled via the existing Redis dependency so ingestion
  and WebSocket fan-out are never blocked by inference latency.
- CPU-only inference is workable at a **reduced frame-sampling rate** (e.g.
  1–3 fps per camera rather than full 25–30 fps) for non-time-critical
  zones; a GPU-enabled host is recommended once more than a handful of
  camera streams run concurrently.
- Per-camera frame-sampling rate is configurable, so compute cost scales
  with how time-critical each zone actually is.
- CARLA and any future TimesFM service are **not part of this deployment**
  at all — separate environments, evaluated independently (§4).

---

## 11. Phased implementation (for approval)

- **Phase 0 (this document):** audit + plan. No production code touched.
- **Phase 1:** `railwatch/vision/` service — OpenCV ingestion, stock YOLO
  detection + built-in tracker, zone/dwell-time rule engine, evidence-frame
  extraction, new API adapter (§7), new tables (§6), tests (§8). Replaces
  `cctv-evidence.js`'s hardcoded demo video with a real extracted evidence
  frame/clip for camera-sourced incidents — no other frontend changes
  required, since evidence-ledger and the incident UI already consume the
  generic event shape.
- **Phase 2:** Multi-camera tracking evaluation — only add Deep SORT if a
  concrete cross-camera identity requirement shows up in real deployments.
- **Phase 3:** TimesFM forecasting, once real corridors have produced
  sustained telemetry history.
- **Separate track, any time:** CARLA-based synthetic scenario environment,
  fully decoupled from this repository.

**Requesting approval to proceed with Phase 1.**
