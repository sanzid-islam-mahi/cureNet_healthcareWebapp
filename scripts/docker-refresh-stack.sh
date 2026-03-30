#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.deploy}"
HOST_OVERRIDE="${1:-}"
TMP_ENV_FILE=""

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE"
  exit 1
fi

cleanup() {
  if [[ -n "$TMP_ENV_FILE" && -f "$TMP_ENV_FILE" ]]; then
    rm -f "$TMP_ENV_FILE"
  fi
}

trap cleanup EXIT

if [[ -n "$HOST_OVERRIDE" ]]; then
  BASE_URL="$HOST_OVERRIDE"
  if [[ ! "$BASE_URL" =~ ^https?:// ]]; then
    BASE_URL="https://$BASE_URL"
  fi

  TMP_ENV_FILE="$(mktemp)"
  cp "$ENV_FILE" "$TMP_ENV_FILE"

  python3 - "$TMP_ENV_FILE" "$BASE_URL" <<'PY'
from pathlib import Path
import sys

env_path = Path(sys.argv[1])
base_url = sys.argv[2]

lines = env_path.read_text().splitlines()
keys = {
    "APP_BASE_URL": base_url,
    "CORS_ORIGIN": base_url,
}
seen = set()
updated = []

for line in lines:
    if "=" not in line or line.lstrip().startswith("#"):
        updated.append(line)
        continue
    key, _value = line.split("=", 1)
    if key in keys:
        updated.append(f"{key}={keys[key]}")
        seen.add(key)
    else:
        updated.append(line)

for key, value in keys.items():
    if key not in seen:
        updated.append(f"{key}={value}")

env_path.write_text("\n".join(updated) + "\n")
PY

  ENV_FILE="$TMP_ENV_FILE"
  echo "==> Using host override: $BASE_URL"
fi

echo "==> Building all services"
docker compose --env-file "$ENV_FILE" build

echo "==> Starting stack in background"
docker compose --env-file "$ENV_FILE" up -d

echo "==> Done"
