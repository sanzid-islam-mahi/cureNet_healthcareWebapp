#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.deploy}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

echo "== Docker services =="
docker compose --env-file "$ENV_FILE" ps

echo
echo "== API health =="
curl -sk "${APP_BASE_URL:-https://localhost}/api/health" || true

echo
echo "== Redis health =="
docker compose --env-file "$ENV_FILE" exec -T redis redis-cli ping || true

echo
echo
echo "== Recent backend logs =="
docker compose --env-file "$ENV_FILE" logs --tail=20 backend || true

echo
echo "== Recent reminder-worker logs =="
docker compose --env-file "$ENV_FILE" logs --tail=20 reminder-worker || true

echo
echo "== Recent redis logs =="
docker compose --env-file "$ENV_FILE" logs --tail=20 redis || true
