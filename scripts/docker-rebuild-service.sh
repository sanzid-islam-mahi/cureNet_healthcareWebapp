#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.deploy}"

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <service>"
  echo "Example: $0 frontend"
  exit 1
fi

SERVICE="$1"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE"
  exit 1
fi

echo "==> Building service: $SERVICE"
docker compose --env-file "$ENV_FILE" build "$SERVICE"

echo "==> Recreating service: $SERVICE"
docker compose --env-file "$ENV_FILE" up -d "$SERVICE"

echo "==> Done"
