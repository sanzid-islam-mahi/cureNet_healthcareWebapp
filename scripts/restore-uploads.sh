#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$ROOT_DIR" | tr '[:upper:]' '[:lower:]')}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-${PROJECT_NAME}_uploads-data}"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <uploads-archive-file>" >&2
  exit 1
fi

ARCHIVE_FILE="$1"

if [[ ! -f "$ARCHIVE_FILE" ]]; then
  echo "Archive file not found: $ARCHIVE_FILE" >&2
  exit 1
fi

docker run --rm \
  -v "${UPLOADS_VOLUME}:/data" \
  -v "$(cd "$(dirname "$ARCHIVE_FILE")" && pwd):/backup:ro" \
  alpine:3.20 \
  sh -c "rm -rf /data/* && tar -xzf /backup/$(basename "$ARCHIVE_FILE") -C /data"

echo "Uploads restore completed from: $ARCHIVE_FILE"
