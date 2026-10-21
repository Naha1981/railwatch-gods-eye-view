#!/bin/sh
# RailWatch worker API test suite (local, scratch D1 only - never touches production).
# Usage: cd railwatch/edge && sh test/run-tests.sh
# Requires: node 18+, ${WRANGLER:-npx wrangler} (devDependency or global).
set -e
cd "$(dirname "$0")/.."
PORT="${RW_TEST_PORT:-8790}"
PERSIST="$(mktemp -d /tmp/rwtestpersistXXXXXX)"
export RW_TEST_PERSIST="$PERSIST"
cleanup(){ kill "$WPID" 2>/dev/null || true; rm -rf "$PERSIST"; }
trap cleanup EXIT
echo "== applying schema + migrations to scratch local D1 =="
${WRANGLER:-npx wrangler} d1 execute railwatch --local --persist-to "$PERSIST" --file=schema.sql >/dev/null
for m in migrate*.sql; do ${WRANGLER:-npx wrangler} d1 execute railwatch --local --persist-to "$PERSIST" --file="$m" >/dev/null; done
echo "== starting worker on :$PORT =="
${WRANGLER:-npx wrangler} dev --local --port "$PORT" --ip 127.0.0.1 --persist-to "$PERSIST" >/tmp/rw-test-dev.log 2>&1 &
WPID=$!
i=0
until curl -s -m2 "http://127.0.0.1:$PORT/api/health" | grep -q '"ok":true'; do
  i=$((i+1)); [ $i -gt 60 ] && { echo "worker failed to start"; cat /tmp/rw-test-dev.log; exit 1; }
  sleep 1
done
echo "== running assertions =="
RW_TEST_BASE="http://127.0.0.1:$PORT" RW_TEST_PERSIST="$PERSIST" node test/api.test.mjs
