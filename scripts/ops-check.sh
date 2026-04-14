#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.deploy}"

load_env_file() {
  local env_file="$1"
  local line
  local key
  local value

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"

    if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
      continue
    fi

    if [[ "$line" != *=* ]]; then
      echo "Invalid env entry in $env_file: $line" >&2
      exit 1
    fi

    key="${line%%=*}"
    value="${line#*=}"
    export "$key=$value"
  done < "$env_file"
}

if [[ -f "$ENV_FILE" ]]; then
  load_env_file "$ENV_FILE"
fi

echo "== Docker services =="
docker compose --env-file "$ENV_FILE" ps

echo
echo "== API health =="
curl -sk "${APP_BASE_URL:-https://localhost}/api/health" || true

echo
echo
echo "== Recent backend logs =="
docker compose --env-file "$ENV_FILE" logs --tail=20 backend || true

echo
echo "== Recent reminder-worker logs =="
docker compose --env-file "$ENV_FILE" logs --tail=20 reminder-worker || true
