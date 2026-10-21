# RailWatch worker deploy + rollback (Cloudflare free tier)

Order matters. The database migration is additive and goes FIRST, so the old
worker keeps working if the code deploy is delayed or rolled back.

## Deploy sequence

1. Apply the newest additive migration to the D1 database (idempotent:
   `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN` only ever adds):
     wrangler d1 execute railwatch --remote --file=migrate2.sql
   Never run a destructive statement. Migrations only add tables/columns.
2. Verify the migration:
     wrangler d1 execute railwatch --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
3. Deploy the worker:
     wrangler deploy
4. Smoke-test (read-only):
     curl https://railwatch-api.nahalabs.workers.dev/api/health
     -> {"ok":true,"service":"railwatch-api","sealCheck":true}
5. Run the API test suite locally against the deployed bundle's source:
     cd railwatch/edge && sh test/run-tests.sh   (25 assertions, scratch local D1)

## Frontend (static UI)

The static UI in railwatch/ is served at railwatch.nahalabs.co.za, proxied by
the nahalabs-app-proxy Cloudflare Worker to the naha-railwatch static site on
Render, which builds from the GitHub repo's main branch. Publishing a frontend
change = merge/push to main; Render rebuilds. The worker ORIGINS list already
includes https://railwatch.nahalabs.co.za so desk sync works cross-origin.

## Rollback

Rollback is a redeploy of the previous worker bundle. There is NO down
migration: added tables/columns are ignored by older code and are harmless to
keep. Never roll back by dropping tables or columns.

  1. git checkout <previous-good-commit> -- railwatch/edge/worker.js
     (or redeploy the previous bundle from CI artifacts)
  2. wrangler deploy
  3. Smoke-test /api/health again.

Data safety: stage_events is append-only; cases are sealed and immutable after
sealing (409 on change); a rollback cannot corrupt either.
