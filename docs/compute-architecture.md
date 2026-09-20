# RailWatch — Compute Architecture Options

No infrastructure has been provisioned or changed. This is research only.
All pricing below is quoted from provider sources found via search on
2026-09-20 and should be re-verified at decision time — prices change.

## VERIFIED FACTS — Render (current deploy target)

Fetched directly from Render's own pricing page content:

| Instance | RAM | CPU | Price/mo |
|---|---|---|---|
| Free | 512 MB | 0.1 | $0 |
| Starter | 512 MB | 0.5 | $7 |
| Standard | 2 GB | 1 | $25 |
| Pro | 4 GB | 2 | $85 |
| Pro Plus | 8 GB | 4 | $175 |
| Pro Max | 16 GB | 4 | $225 |
| Pro Ultra | 32 GB | 8 | $450 |
| Custom | up to 512 GB | up to 64 | contact sales |

- Persistent disk: **$0.25/GB/month**
- Postgres: Free (30-day limit, 1 GB) up to Pro-512gb ($6,200/mo, 128 CPU,
  512 GB RAM); mid-range Basic-1gb is $19/mo
- Redis ("Key Value"): Free (25 MB) up to Pro Plus (10 GB, $250/mo)
- Cron jobs: billed per-minute, from $0.00016/min (Starter) to
  $0.00405/min (Pro Plus)
- Background workers exist as a first-class service type
- **No GPU instance type appears anywhere in Render's published pricing.**
- Even "Custom" tops out RAM at 512 GB — technically enough for ODM's own
  128 GB/2,500-image guidance, but this would need a direct sales
  conversation, not a self-serve signup, and cost is unquoted ("contact
  sales").

## VERIFIED FACTS — Object storage (for photogrammetry/evidence output)

- **Cloudflare R2**: Standard storage $0.015/GB-month, Infrequent Access
  $0.01/GB-month, Class A ops $4.50/million, Class B ops $0.36/million,
  **no egress fee**. Free tier: 10 GB storage + 1M Class A + 10M Class B ops.
  (Consistent across multiple independent sources checked; not fetched
  directly from Cloudflare's own pricing page this pass — re-verify before
  committing budget.)
- AWS S3 Standard was cited by the same sources at roughly $0.023/GB-month
  storage plus egress starting near $0.09/GB after a free 100 GB/month —
  **UNVERIFIED against AWS's own page this pass**, included only for
  relative comparison.

## THREE OPTIONS

### A. Completely free / self-hosted development

- **Compute:** developer's own machine or a free-tier cloud VM (e.g. Render
  Free web service for the existing app; NodeODM run locally via Docker on
  a dev machine, not deployed anywhere persistent)
- **Storage:** local disk during development; Cloudflare R2 free tier
  (10 GB) for shared test artifacts if needed
- **RAM:** whatever the developer's machine has — realistically limits
  photogrammetry test jobs to small image sets (tens of images), consistent
  with ODM's own scaling guidance
- **GPU:** none
- **Operational complexity:** low — no new hosted infrastructure, but no
  uptime guarantee and nothing customer-facing
- **Runs on Render:** the existing web app only (already true today)
- **Must run elsewhere:** NodeODM (local Docker), vision inference (local,
  CPU)
- **Cost:** $0

### B. Cheapest practical production architecture

- **Compute (web app):** Render Standard ($25/mo, 2 GB/1 CPU) — current app
  is a Cesium+FastAPI app, not itself compute-heavy; this is a reasonable
  starting tier, though should be checked against actual current usage
  before assuming it's sufficient
- **Compute (NodeODM worker):** **not Render.** Needs a separate host with
  real RAM — e.g. a single mid-spec VM (8–16 GB RAM) from any general VPS
  provider, sized for small per-incident image sets only (tens of images,
  not thousands). Exact provider/price not chosen here — that's a real
  shopping decision, not assumed.
- **Vision inference:** runs inside the existing FastAPI backend or a small
  sidecar process on the same Render Standard/Pro tier — CPU-only ONNX
  Runtime inference on small images is lightweight enough not to need
  dedicated compute at low volume
- **Storage:** Cloudflare R2 free tier initially (10 GB), paid tier
  ($0.015/GB-month, no egress fee) as volume grows
- **RAM:** 2 GB (web) + 8–16 GB (photogrammetry worker)
- **GPU:** none
- **Operational complexity:** medium — one extra host to patch/monitor
  beyond Render's managed surface
- **Runs on Render:** web app, Postgres, Redis, vision inference
- **Must run elsewhere:** NodeODM worker
- **Estimated cost:** ~$25–50/mo Render (web + small Postgres/Redis bump) +
  cost of the external worker VM (provider-dependent, not quoted here) +
  near-$0 storage at low volume. **Do not treat this as a firm number** —
  it's a shape, not a quote, until an actual worker host is chosen.

### C. Scalable production architecture

- **Compute (web app):** Render Pro or Pro Plus ($85–175/mo) with
  horizontal autoscaling as traffic grows
- **Compute (NodeODM worker):** a dedicated worker pool (multiple instances
  behind a queue) sized for real image-set volumes, potentially the
  128 GB-class machine ODM itself recommends for large jobs — this is a
  meaningfully different cost tier than option B and needs its own
  provider/pricing research when actually needed, not guessed now
- **Vision inference:** separate scalable inference service if volume
  justifies it, still CPU-based unless a GPU need is proven by real
  workload data
- **Storage:** Cloudflare R2 paid tier, sized to actual evidence retention
  policy (not estimated here — depends on retention requirements not yet
  defined)
- **RAM:** several GB (web, autoscaled) + up to 128 GB-class (photogrammetry,
  only if large-corridor jobs become real)
- **GPU:** only if a specific need (e.g. video-realtime vision inference)
  is proven — not assumed by default
- **Operational complexity:** high — multiple services, queueing, worker
  autoscaling, monitoring across providers
- **Runs on Render:** web app, Postgres, Redis
- **Must run elsewhere:** photogrammetry worker pool, and vision inference
  if it outgrows the web process
- **Cost:** not estimated — this tier depends entirely on actual volume,
  which doesn't exist yet. Any number given here would be invented.

## RECOMMENDATION

Start at **Option A** for continued development, move to **Option B** for
first production customer(s). Do not build toward Option C until real usage
data (image-set sizes, request volume, retention needs) exists to size it —
building it now would be guessing at a scale that hasn't been demonstrated.

## WHAT NOT TO BUILD YET

- No autoscaling worker pool (Option C) without real usage data
- No GPU provisioning anywhere, for either vision or photogrammetry, until a
  specific workload proves CPU insufficient
- No committed processing-time SLA to customers before a real benchmark
- No object storage integration until an actual output artifact exists to
  store (this is Phase 2, not now)
