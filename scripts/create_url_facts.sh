#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" || true; pwd -P)
ROOT_DIR="${SCRIPT_DIR}/.."
KEYSERVER_FACTS_DIR="${ROOT_DIR}/keyserver/facts"
LANDING_URL_PATH="${KEYSERVER_FACTS_DIR}/landing_url.json"
WEBAPP_URL_PATH="${KEYSERVER_FACTS_DIR}/webapp_url.json"
KEYSERVER_URL_PATH="${KEYSERVER_FACTS_DIR}/keyserver_url.json"

if [[ ! -d "$KEYSERVER_FACTS_DIR" ]]; then
  mkdir -p "$KEYSERVER_FACTS_DIR"
fi

if [[ ! -f "$LANDING_URL_PATH" ]]; then
  cp "$SCRIPT_DIR/templates/landing_url.json" "$LANDING_URL_PATH"
fi

if [[ ! -f "$WEBAPP_URL_PATH" ]]; then
  cp "$SCRIPT_DIR/templates/webapp_url.json" "$WEBAPP_URL_PATH"
fi

if [[ ! -f "$KEYSERVER_URL_PATH" ]]; then
  cp "$SCRIPT_DIR/templates/keyserver_url.json" "$KEYSERVER_URL_PATH"
fi
