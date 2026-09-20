# Naha RailWatch Command Center — MVP

## Council verdict

**GO — but do not sell this as a generic God's Eye View clone.** Sell it as a rail operations/security intelligence layer that can sit over existing telemetry, CCTV, GIS and incident systems.

| Council seat | Verdict | Main point |
|---|---|---|
| Systems architect | GO | Keep GEV as the spatial UI; isolate a durable event/telemetry service behind it. |
| Security engineer | CONDITIONAL | WebSocket authentication, tenant isolation, audit trails, network controls and secret hygiene are mandatory. |
| Reliability engineer | CONDITIONAL | In-memory connections are demo-only; production needs Redis/pub-sub or a managed event bus. |
| Rail operations specialist | GO | The winning workflow is detect → locate → verify → dispatch → resolve → prove. |
| GIS specialist | GO | Corridor/segment/km-marker context is a strong spatial abstraction for operators. |
| Data engineer | GO | Normalize all telemetry into a versioned event schema and retain source provenance. |
| Product strategist | GO | Package as an integration product, not as a map. |
| Procurement strategist | CONDITIONAL | Large public-sector awards require supplier/compliance readiness, references and bid-specific requirements. |
| Commercial lead | GO | Start with a paid pilot/integration rather than trying to win a multi-year prime contract immediately. |
| Cyber-risk lead | NO-GO for production today | The original snippet has wildcard CORS, unauthenticated ingestion and an in-memory broker. |
| Infrastructure lead | GO | Vercel for browser UI; long-lived FastAPI/WebSocket service on a WebSocket-capable host. |
| UX lead | GO | Keep the dramatic camera movement, but surface evidence and operator actions before spectacle. |
| AI lead | GO LATER | Add anomaly scoring/copilot only after deterministic telemetry workflows are reliable. |
| Integration lead | GO | Design adapters for GPS/AVL, signalling, CCTV, access-control and incident-management systems. |
| Finance lead | GO | Pilot can be fixed-fee; recurring value is monitoring/integration/support. |
| Founder seat | GO | Build the demo now, use it to open conversations, and avoid claims of being an official Transnet system. |
| Red-team/dissent seat | CONDITIONAL | Biggest failure mode is confusing a compelling visual demo with a certified rail-control product. |
| Chair | GO WITH GATES | Productize the control-room workflow, prove one corridor, then expand. |

## Commercial signal

As of 10 September 2026, Transnet's official eSupplier portal lists a national RFP for the supply of real-time locomotive GPS trackers for 5.5 years under reference `TFR/2026/03/0066/2588/RFP`, showing a closing date of 17 September 2026 at 14:00. Third-party tender aggregators show conflicting versions/dates, so the official Transnet portal is the source of truth before any bid action.

The opportunity fit is real, but the tender appears to concern the **tracker supply/service itself**, not only a command-center UI. The right NahaLabs strategy is therefore to use RailWatch as the **software/intelligence layer** and partner with an established hardware/GPS/telematics provider for any procurement that requires certified field hardware.

Transnet's 2025 reporting also identifies security-related incidents and cable theft as material operational problems, while noting investment in technology to prevent theft and vandalism. That creates a second commercial lane: security/event response and network protection intelligence.

## Architecture

```text
[GPS / AVL / IoT / CCTV / partner systems]
                  |
                  v
        [Telemetry adapters]
                  |
                  v
       [RailWatch Event API]
       FastAPI + validation
                  |
          +-------+--------+
          |                |
          v                v
   [Event store]     [Redis/Event Bus]
          |                |
          +-------+--------+
                  |
                  v
        [C2 WebSocket API]
                  |
                  v
       [Cesium RailWatch UI]
                  |
       +----------+-----------+
       |                      |
       v                      v
  Incident queue          Evidence/audit
```

### MVP boundary

- Browser: Cesium-based command-center view.
- API: authenticated line-breach ingestion, recent events, WebSocket broadcast, health endpoint.
- Demo: one-click simulated breach for a South African corridor coordinate.
- Security: explicit origin allow-list, separate ingestion/WebSocket keys, input constraints, deduplication, sanitized auth errors.
- Deployment: `render.yaml` for the API; static `railwatch/` UI can be served by Vercel or another static host.

### Current production status

The RailWatch MVP has crossed the original prototype-only gates:

- PostgreSQL event persistence is implemented and can fail closed when required.
- Redis-compatible event fan-out is configured for the production Render service.
- Role-based operator authentication and tenant isolation are implemented.
- Signed telemetry with HMAC timestamp/nonce replay protection is implemented.
- Hash-linked server audit persistence is implemented.
- Deterministic incident stages, SLA timers, acknowledgement/closure, replay and evidence export are implemented.
- Guided operator UX is implemented: DETECT → LOCATE → VERIFY → RESPOND → RESOLVE → PROVE, with workspace minimize/full-screen behavior.
- WhatsApp pairing, operator notification flow and incident alerting are integrated.
- NahaLLM-backed incident brief, decision challenge and management summary are implemented behind authenticated, tenant-scoped endpoints with rate limiting.
- A production `/readyz` readiness check covers configuration, PostgreSQL and Redis.

### Remaining enterprise gates

- Enterprise SSO/IdP integration and centralized identity lifecycle.
- Formal cybersecurity/POPIA/legal review, penetration testing and security assurance.
- Backup/restore drill, retention policy, disaster recovery and operational runbooks.
- Authoritative railway GIS/network datasets and real telemetry/CCTV adapters for a customer deployment.
- Browser-compatible CCTV/media gateway where required; **do not put RTSP directly in an HTML5 `<video>` element.**
- Rail-domain assurance and any customer/procurement-specific certification requirements.
- Production WhatsApp provider credentials, NahaLLM gateway credentials and Render environment secrets must be configured outside Git.

## Demo / production URL shape

Production users should not receive API keys or operator bootstrap credentials in the URL. The supported browser access pattern is:

`https://naha-railwatch.onrender.com/`

The app obtains a short-lived operator session through the authenticated browser flow. Explicit demo environments may still use the legacy query-parameter flow, but those URLs must never be used for production credentials.

## Commercial packaging

### Pilot

**RailWatch Corridor Pilot — R75k–R250k fixed fee**

One corridor, one event class, one telemetry adapter, one command-center workflow, operator training, and a measured before/after report.

### Managed service

**R15k–R60k/month** depending on monitored corridors, integrations, support hours and data retention.

### Enterprise integration

Price separately for hardware partnerships, 24/7 support, private networking, SSO, SIEM integration, SLA and production assurance.

These are NahaLabs working-price hypotheses, not Transnet budget claims.

## Important positioning

Do not say:

> "NahaLabs has built Transnet's command center."

Say:

> "NahaLabs built a rail operations intelligence prototype that demonstrates how existing telemetry can be converted into a live geospatial incident-response workflow."

The objective of the first meeting is **not** to sell a five-year contract. It is to secure access to a real operational problem, data shape, pilot owner and procurement path.
