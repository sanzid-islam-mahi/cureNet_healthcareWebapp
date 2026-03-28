#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.deploy}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE"
  exit 1
fi

echo "==> Building all services"
docker-compose --env-file "$ENV_FILE" build

echo "==> Stopping stack"
docker-compose --env-file "$ENV_FILE" down

echo "==> Starting stack in background"
docker-compose --env-file "$ENV_FILE" up -d

echo "==> Done"
