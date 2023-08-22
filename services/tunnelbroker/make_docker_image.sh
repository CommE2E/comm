#!/usr/bin/env bash

# This file exists to make a smaller docker context, so that building it is
# significantly faster and requires less system resources

SCRIPT_DIR="$(cd "$(dirname "$0")" || exit 1; pwd -P)"
BUILD_DIR="${SCRIPT_DIR}/target/oci_image"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"/{scripts,shared,services/tunnelbroker}

cp "$SCRIPT_DIR/../../scripts/install_protobuf.sh" "$BUILD_DIR"/scripts
cp -r "${SCRIPT_DIR}/../../shared" "$BUILD_DIR"/
cp -r "${SCRIPT_DIR}"/{Cargo.toml,Cargo.lock,build.rs,src} \
  "$BUILD_DIR"/services/tunnelbroker/

docker build "$@" -f "${SCRIPT_DIR}/Dockerfile" "$BUILD_DIR"
