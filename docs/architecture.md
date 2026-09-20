# RailWatch — Architecture

## Current state (as audited 2026-09-20)

**This repo is a fork of [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view)**
(`package.json` name: `gods-eye-view`, MIT). RailWatch is built as a layer on
top of that base, not a separate application.

### Frontend
- Vanilla JS + [Cesium](https://cesium.com/) 3D globe, bundled with Vite
  (`vite-plugin-cesium`)
- RailWatch-specific modules in `/railwatch/*.js` (+ matching `.css`):
  `app.js`, `evidence-ledger.js`, `incident-history.js`, `audit-feed.js`,
  `cctv-evidence.js`, `dispatch-intelligence.js`, `dispatch-access.js`,
  `control-room-status.js`, `resolution-intelligence.js`,
  `operations-assurance.js`, `operator-journey.js`,
  `whatsapp-journey.js`, `whatsapp-operations.js`, `asset-operator.js`,
  `acknowledgement.js`, `intelligence-demo.js`, `stage-progress.js`
- Broader God's Eye View src tree (`/src/`) supplies map layers, voice
  control, render governor, first-run experience, annotation engine, etc. —
  RailWatch reuses this rather than re-implementing a map stack

### Backend
- **FastAPI** (`railwatch/backend/main.py`), Pydantic v2 models with
  `extra="forbid"` — strict incoming schemas
- Data contract already models: `Severity`, `Coordinates`, `CameraPreset`,
  `IncidentAsset`, `IncidentContext`, `TelemetryBreachAlert` — including a
  `data_classification` field defaulting to `"DEMO · NOT AUTHORITATIVE GIS"`
- `EventStore` (`event_store.py`), `audit_persistence.py`,
  `incident_persistence.py`, `whatsapp_persistence.py`
- `realtime_bus.py`, `generic_telemetry.py`, `operations.py`
- **Telemetry ingest already built for third-party handoff:**
  `POST /api/v1/telemetry/ingest` (keyed via `x-railwatch-key`) and
  `POST /api/v1/telemetry/signed-ingest` (HMAC) — see
  `railwatch/TRANSNET_INTEGRATION.md`. Accepts a wide set of common field
  aliases and normalizes them into the incident contract.
- **WhatsApp operator channel already built:** `whatsapp_integration.py`,
  `whatsapp_operator.py`, `whatsapp_persistence.py`
- Legacy/compat: `triton_legacy.py`, `triton_udp_bridge.py`, plus
  `integration/triton_udp_gateway.py`
- Deploy target: Render (`railwatch/backend/render.yaml`)
- Deps: `fastapi`, `uvicorn`, `pydantic`, `psycopg[binary]` (Postgres),
  `redis`, `httpx`

### Evidence & provenance patterns already present
- `evidence-ledger.js` / `audit-feed.js` on the frontend
- `event_id` fields with strict regex validation server-side
- Explicit `data_classification` labeling baked into the incident contract
- HMAC-signed ingest path for external-system provenance

This means the target architecture's "evidence provenance / SHA-256 hashes /
VERIFIED-DERIVED-INFERRED-DISPUTED-UNKNOWN states" requirement is an
**extension** of an existing pattern, not a new subsystem.

## Recommended additions (see implementation-plan.md for sequencing)

```
FIELD CAPTURE (existing: WhatsApp + telemetry ingest)
   -> PHOTO/VIDEO/GPS/TIMESTAMP (existing contract fields + media_url)
      -> VISION ANALYSIS (new: src/integrations/visionAdapter.js -> TBD provider)
      -> 3D/PHOTOGRAMMETRY (new: src/integrations/photogrammetryAdapter.js -> OpenDroneMap)
         -> GEOSPATIAL MAP (existing: Cesium/God's Eye View layers)
         -> AI DETECTION -> EVIDENCE RECORD (extend evidence-ledger.js + backend hashing)
            -> INCIDENT/DEFECT (existing: TelemetryBreachAlert/IncidentContext)
               -> RISK/PRIORITY (existing: Severity enum)
                  -> INVESTIGATION -> REPORT (new: evidence video via ffmpeg,
                     src/integrations/evidenceVideoAdapter.js)
```

All new integrations sit behind adapters in `src/integrations/` so any one of
them (photogrammetry provider, vision provider) can be swapped without
touching call sites in `railwatch/*.js` or `railwatch/backend/`.

## Explicitly not changed

- No rewrite of the Cesium/God's Eye View base
- No new frontend framework
- No change to the existing telemetry ingest contract or WhatsApp integration
- No paid service turned on
