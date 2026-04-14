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

load_env_file "$ENV_FILE"

if [[ $# -gt 3 ]]; then
  echo "Usage: $0 [db_user] [db_password] [db_name]" >&2
  exit 1
fi

if [[ $# -ge 1 ]]; then
  DB_USER="$1"
fi

if [[ $# -ge 2 ]]; then
  DB_PASSWORD="$2"
fi

if [[ $# -ge 3 ]]; then
  DB_NAME="$3"
fi

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/mysql}"
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_FILE="$BACKUP_DIR/${DB_NAME:-curenet}_$STAMP.sql"
TMP_OUTPUT_FILE="${OUTPUT_FILE}.tmp"

cleanup_failed_backup() {
  rm -f "$TMP_OUTPUT_FILE"
}

trap cleanup_failed_backup EXIT

if ! docker compose --env-file "$ENV_FILE" exec -T -e MYSQL_PWD="${DB_PASSWORD}" mysql \
  mysqldump --no-tablespaces -u"${DB_USER}" "${DB_NAME}" > "$TMP_OUTPUT_FILE"; then
  echo "MySQL backup failed" >&2
  exit 1
fi

mv "$TMP_OUTPUT_FILE" "$OUTPUT_FILE"
trap - EXIT

echo "MySQL backup created: $OUTPUT_FILE"
