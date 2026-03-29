#!/usr/bin/env bash

set -euo pipefail

DOMAIN="${1:-curenet.app}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOURCE_DIR="/etc/letsencrypt/live/${DOMAIN}"
TARGET_DIR="${REPO_ROOT}/deploy/certs"

if [[ ! -d "${SOURCE_DIR}" ]]; then
  echo "Certificate directory not found: ${SOURCE_DIR}" >&2
  echo "Run certbot first, for example:" >&2
  echo "  sudo certbot certonly --standalone -d ${DOMAIN}" >&2
  exit 1
fi

if [[ ! -f "${SOURCE_DIR}/fullchain.pem" || ! -f "${SOURCE_DIR}/privkey.pem" ]]; then
  echo "Expected certificate files were not found in ${SOURCE_DIR}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"
cp "${SOURCE_DIR}/fullchain.pem" "${TARGET_DIR}/local.crt"
cp "${SOURCE_DIR}/privkey.pem" "${TARGET_DIR}/local.key"
chmod 644 "${TARGET_DIR}/local.crt"
chmod 600 "${TARGET_DIR}/local.key"

echo "Synced Let's Encrypt certificate for ${DOMAIN} to:"
echo "  ${TARGET_DIR}/local.crt"
echo "  ${TARGET_DIR}/local.key"
echo
echo "Next step:"
echo "  docker compose --env-file .env.deploy up -d nginx-proxy"
