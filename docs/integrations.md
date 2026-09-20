# RailWatch — External Integration Audit

Status: DRAFT — audit complete, highest-value adapters scaffolded, nothing
destructive or paid has been enabled. Verified 2026-09-20.

## 0. Framing correction

`package.json` name is `gods-eye-view`; this repository is itself a fork of
[bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view)
(MIT, ~16.7k★, active). RailWatch is a layer built on top of it
(`/railwatch/*.js` + `/railwatch/backend/`). "Integrate God's Eye View" is
therefore already satisfied — there is no separate repo to pull in. Any future
"God's Eye View" work means upgrading this fork, not adding a dependency.

## 1. Tool dossiers

### TOOL: God's Eye View
- PURPOSE: geospatial/3D operational map, evidence visualization
- CURRENT REPO: this repository (fork of bilawalsidhu/gods-eye-view)
- LICENSE: MIT
- DEPENDENCIES: Cesium, vite-plugin-cesium (already installed)
- SECURITY RISKS: none beyond what's already shipped
- API/SDK: n/a — it's the app itself
- WHAT RAILWATCH WILL USE: the existing globe, camera, layer, and voice systems as-is
- WHAT WE WILL NOT USE: nothing to exclude — no separate install needed
- IMPLEMENTATION FILES: n/a
- ENVIRONMENT VARIABLES: existing (`GOOGLE_MAPS_API_KEY`, `CESIUM_ION_TOKEN`, etc. — see `.env.example`)
- COST: $0 (already present)
- ALTERNATIVES: n/a
- **VERDICT: NO ACTION — already the foundation**

### TOOL: OpenCut
- PURPOSE: turning inspection footage into evidence clips / annotated video / investigation packages
- CURRENT REPO: [OpenCut-app/OpenCut](https://github.com/OpenCut-app/OpenCut)
- LICENSE: MIT
- DEPENDENCIES: React, Cloudflare Worker API, Rust core (in-progress), moon/proto toolchain
- SECURITY RISKS: n/a — not integrated
- API/SDK: none published yet; project is mid-rewrite. The `/editor` route in
  the current `main` branch renders "Coming soon." A separate, older working
  build lives in `opencut-app/opencut-classic`, but that's a different,
  unaudited repo with its own dependency surface (Postgres, Redis, Better Auth).
- WHAT RAILWATCH WILL USE: nothing
- WHAT WE WILL NOT USE: the editor, its API, its plugin system
- IMPLEMENTATION FILES: none
- ENVIRONMENT VARIABLES: none
- COST: $0, but effort cost of tracking an unstable rewrite is real
- ALTERNATIVES: **ffmpeg** (CLI, mature, scriptable) for clipping, burning in
  timestamp/GPS/hash overlays, and concatenating evidence video —
  no framework dependency, runs headless on the backend, matches the
  "prefer libraries over apps" rule.
- **VERDICT: REJECTED — target app is unfinished. Use ffmpeg instead (see §2).**

### TOOL: ClawHub
- PURPOSE: reusable agent skills for RailWatch workflows
- CURRENT REPO: registry at clawhub.ai / `npm i -g clawhub`; CLI installs
  arbitrary third-party "AgentSkills" bundles
- LICENSE: registry itself is a hosted service; individual skills vary and are
  largely unaudited
- DEPENDENCIES: Node CLI, network access to the registry
- SECURITY RISKS: **High.** It's a skill marketplace for a *different* agent
  framework ("OpenClaw"), open to any GitHub account at least a week old.
  Skills are unmoderated beyond community flagging and execute with whatever
  permissions the installing agent has. Installing one into anything touching
  incident/evidence data would be an unreviewed code-execution surface.
- API/SDK: CLI + vector search, not an API RailWatch would call
- WHAT RAILWATCH WILL USE: nothing
- WHAT WE WILL NOT USE: the registry, the CLI, any published skill
- IMPLEMENTATION FILES: none
- ENVIRONMENT VARIABLES: none
- COST: $0 (some skills paid, irrelevant since not used)
- ALTERNATIVES: none needed — RailWatch has no agent-skill runtime to extend
- **VERDICT: REJECTED — wrong ecosystem, real supply-chain risk, no fit for a FastAPI+Cesium app**

### TOOL: Potato Mesh
- PURPOSE: offline/low-connectivity field inspection networking
- CURRENT REPO: [l5yth/potato-mesh](https://github.com/l5yth/potato-mesh) (~312★, JS, last push Apr 2026)
- LICENSE: to confirm at implementation time (not yet checked in detail)
- DEPENDENCIES: it is a **dashboard** — ingestor + web containers that read
  telemetry from a **Meshtastic** or **Meshcore** LoRa mesh. It does not
  itself provide mesh networking; the mesh capability is Meshtastic/Meshcore
  hardware+firmware, which PotatoMesh visualizes.
- SECURITY RISKS: low, self-hosted; standard container/API-key hygiene applies
- API/SDK: ingestor reads serial/USB from a Meshtastic node; web container has an HTTP API
- WHAT RAILWATCH WILL USE (if pursued): none yet — this is a Phase 3, no-budget-impact idea
- WHAT WE WILL NOT USE: nothing yet
- IMPLEMENTATION FILES: none yet
- ENVIRONMENT VARIABLES: none yet
- COST: $0 software; real hardware cost for LoRa radios if pursued
- ALTERNATIVES: Meshtastic directly (the actual mesh layer); a simple
  store-and-forward queue in the existing WhatsApp/telemetry ingest path for
  field devices that regain connectivity intermittently, which needs no new
  dependency at all.
- **VERDICT: LOW PRIORITY / DEFERRED — real project, but it's a dashboard for
  a mesh you don't have yet, not offline capability by itself**

### TOOL: 3D scanning / photogrammetry
- PURPOSE: convert inspection imagery/video into 3D evidence
- CANDIDATES (both verified real, active, open-source):
  - **OpenDroneMap / ODM** — Apache-2.0, mature, Docker-deployable, CLI +
    REST via NodeODM/WebODM, designed for drone/photo-set → orthomosaic/point
    cloud/mesh. Best fit for track/corridor imagery.
  - **Meshroom (AliceVision)** — MPL-2.0, GUI + CLI, general photogrammetry
    pipeline, heavier GPU requirement.
- LICENSE: Apache-2.0 (ODM) / MPL-2.0 (AliceVision)
- DEPENDENCIES: Docker, significant CPU/GPU and storage for reconstruction jobs
- SECURITY RISKS: low — self-hosted batch job, no inbound attack surface if
  queued/backgrounded; treat output paths and job IDs like any other file upload
- API/SDK: ODM has a documented REST API (NodeODM) suited to a backend adapter
- WHAT RAILWATCH WILL USE: ODM behind a job-queue adapter (§3) — submit an
  image set, poll status, receive point cloud / mesh artifact reference
- WHAT WE WILL NOT USE: GUI tooling, GPU-only paths unless self-hosting hardware allows it
- IMPLEMENTATION FILES: `src/integrations/photogrammetryAdapter.js` (interface,
  scaffolded), backend job endpoint (not yet built — Phase 2)
- ENVIRONMENT VARIABLES: `RAILWATCH_ODM_ENDPOINT`, `RAILWATCH_ODM_API_KEY` (if the NodeODM instance requires auth)
- COST: $0 software; compute cost if self-hosted, scales with job volume
- ALTERNATIVES: skip 3D entirely for MVP; 2D annotated imagery may be sufficient evidence for early customers
- **VERDICT: HIGH VALUE — adapter interface scaffolded, backend wiring is Phase 2**

### TOOL: Visual/vision AI
- PURPOSE: AI analysis of railway inspection imagery (defect detection)
- CURRENT REPO/API: **visualgpt.io could not be verified as a fit.** It
  presents as a consumer image/video *generation* and editing tool aimed at
  marketing visuals, not a computer-vision detection/analysis API — no public
  SDK or docs for programmatic defect detection were found.
- SECURITY RISKS: n/a — not integrated
- WHAT RAILWATCH WILL USE: nothing from visualgpt.io
- ALTERNATIVES (real, verifiable):
  - Self-hosted open-source detection model (YOLO-family or similar) behind
    RailWatch's own inference endpoint — no vendor lock-in, no per-call cost
  - A documented vendor vision API (evaluate case-by-case against rule #11,
    "no paid services unless absolutely necessary")
- IMPLEMENTATION FILES: `src/integrations/visionAdapter.js` (interface only,
  scaffolded — no model wired up yet, deliberately, since no verified
  provider was identified this pass)
- ENVIRONMENT VARIABLES: `RAILWATCH_VISION_PROVIDER`, `RAILWATCH_VISION_ENDPOINT`, `RAILWATCH_VISION_API_KEY`
- COST: TBD — depends on which provider is chosen
- **VERDICT: NOT INTEGRATED — visualgpt.io does not check out; adapter shell
  scaffolded so a verified provider can be dropped in later without touching
  call sites**

## 2. What gets built now vs. later

| Phase | Item | Why |
|---|---|---|
| Now (this pass) | `docs/integrations.md`, `docs/architecture.md`, `docs/implementation-plan.md` | Required deliverables, no code risk |
| Now (this pass) | `src/integrations/` adapter interfaces (photogrammetry, vision, evidence-video) | Clean seams per rule #9, zero runtime behavior change |
| Phase 1 | ffmpeg-based evidence clip generation in backend | Real capability, low dependency risk, matches "evidence video" requirement directly |
| Phase 2 | OpenDroneMap job adapter wired to a real NodeODM instance | Needs infra decision (self-host where?) |
| Phase 3 | Vision AI provider selection + wiring | Needs a provider decision the audit couldn't make for you |
| Deferred | Meshtastic/PotatoMesh offline field layer | Needs hardware; store-and-forward on existing ingest path covers the near-term need |
| Rejected | OpenCut, ClawHub | See dossiers above |
