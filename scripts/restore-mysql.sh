#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.deploy}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

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

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <sql-backup-file>" >&2
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

load_env_file "$ENV_FILE"

docker compose --env-file "$ENV_FILE" exec -T mysql \
  mysql -u"${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" < "$BACKUP_FILE"

echo "MySQL restore completed from: $BACKUP_FILE"
