#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.deploy}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/uploads}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$ROOT_DIR" | tr '[:upper:]' '[:lower:]')}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-${PROJECT_NAME}_uploads-data}"

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d_%H%M%S)"
ARCHIVE_FILE="$BACKUP_DIR/uploads_$STAMP.tar.gz"

docker run --rm \
  -v "${UPLOADS_VOLUME}:/data:ro" \
  -v "$BACKUP_DIR:/backup" \
  alpine:3.20 \
  sh -c "tar -czf /backup/$(basename "$ARCHIVE_FILE") -C /data ."

echo "Uploads backup created: $ARCHIVE_FILE"
