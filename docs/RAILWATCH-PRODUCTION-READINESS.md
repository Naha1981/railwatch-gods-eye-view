# RailWatch Production Readiness

**Status:** Production-hardened application branch; external environment and enterprise-governance gates remain.

## Implemented

- Guided operator journey: DETECT → LOCATE → VERIFY → RESPOND → RESOLVE → PROVE.
- Workspace lifecycle with minimize, restore, full-screen and automatic workspace hand-off.
- Durable PostgreSQL event persistence with Redis-compatible real-time fan-out configured in Render.
- Tenant-scoped operator authorization with controller/dispatcher/viewer/admin roles.
- Signed telemetry ingestion with timestamp/nonce replay protection.
- Server-side hash-linked audit persistence.
- Tenant-scoped production event reads.
- Secure browser operator session endpoint so operator access codes are not placed in URLs.
- WhatsApp account/pairing/alert workflow retained.
- Incident evidence ledger and downloadable incident report retained.
- NahaLLM operator intelligence: incident brief, decision challenge and management summary.
- AI endpoints require operator authentication, tenant scope and per-operator rate limiting.
- NahaLLM client has bounded retries, response-size limits and a circuit breaker.
- Render readiness endpoint: `/readyz` for configuration, PostgreSQL and Redis checks.
- Production Render blueprint uses paid compute sizes instead of Free datastore resources.

## External production gates

1. Configure `RAILWATCH_OPERATOR_ACCESS_CODE` in the Render service.
2. Configure `NAHALLM_URL` and `NAHALLM_API_KEY` in Render and verify the gateway is reachable.
3. Keep `RAILWATCH_DEMO_MODE=false` for the production environment.
4. Verify the WhatsApp Operator URL, API key, webhook secret, recipients and authorised operators.
5. Run the live production smoke against `/healthz`, `/readyz`, telemetry ingestion, operator auth, AI, WhatsApp and report generation.
6. For true enterprise deployment, add an enterprise IdP/SSO, formal security review, POPIA/legal review, backup/restore drill, retention policy, incident response runbook and rail-domain assurance. The software is not represented as certified signalling or train-control software.

## Production boundary

RailWatch is an operations-intelligence and evidence workflow. It must not autonomously control signalling, train movement or field dispatch. Demo/schematic assets must remain clearly labelled until authoritative network and telemetry adapters are integrated.
