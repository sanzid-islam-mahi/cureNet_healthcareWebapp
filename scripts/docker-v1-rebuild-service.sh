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

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$PWD")}"

echo "==> Building service: $SERVICE"
docker-compose --env-file "$ENV_FILE" build "$SERVICE"

echo "==> Removing old containers for service: $SERVICE"
CONTAINER_IDS="$(docker ps -aq \
  --filter "label=com.docker.compose.project=${PROJECT_NAME}" \
  --filter "label=com.docker.compose.service=${SERVICE}")"

if [[ -n "$CONTAINER_IDS" ]]; then
  docker rm -f $CONTAINER_IDS
else
  echo "No existing containers found for $SERVICE"
fi

echo "==> Starting service: $SERVICE"
docker-compose --env-file "$ENV_FILE" up -d "$SERVICE"

echo "==> Done"
