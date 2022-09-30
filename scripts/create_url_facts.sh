#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" || true; pwd -P)
ROOT_DIR="${SCRIPT_DIR}/.."
KEYSERVER_FACTS_DIR="${ROOT_DIR}/keyserver/facts"
COMMAPP_URL_PATH="${KEYSERVER_FACTS_DIR}/commapp_url.json"
LANDING_URL_PATH="${KEYSERVER_FACTS_DIR}/landing_url.json"

if test ! -d "$KEYSERVER_FACTS_DIR"; then
  mkdir -p "$KEYSERVER_FACTS_DIR"
fi

if test ! -f "$COMMAPP_URL_PATH"; then
  cp "$SCRIPT_DIR/templates/commapp_url.json" "$COMMAPP_URL_PATH"
fi

if test ! -f "$LANDING_URL_PATH"; then
  cp "$SCRIPT_DIR/templates/landing_url.json" "$LANDING_URL_PATH"
fi
