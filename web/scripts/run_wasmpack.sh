#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")"; pwd -P)

CRATE_PATH="${SCRIPT_DIR}/../backup-client-wasm"
OUT_DIR="wasm"
OUT_NAME="backup-client-wasm"

wasm-pack build "${CRATE_PATH}" --target web --no-typescript --no-pack --out-dir "${OUT_DIR}" --out-name "${OUT_NAME}"

# Remove the autogenerated .gitignore
rm "${CRATE_PATH}/${OUT_DIR}/.gitignore"

# Include the generated tag
OUTPUT_FILE="${CRATE_PATH}/${OUT_DIR}/${OUT_NAME}.js"

GENERATED_TAG="generated"
sed -i -e "1i\/\/ \@${GENERATED_TAG}" "${OUTPUT_FILE}"
