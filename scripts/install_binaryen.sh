#!/usr/bin/env bash

set -euo pipefail

BINARYEN_VERSION=128

ARCHITECTURE="$(uname -m)"
case "${ARCHITECTURE}" in
  x86_64)
    BINARYEN_TARGET='x86_64-linux'
    ;;
  aarch64 | arm64)
    BINARYEN_TARGET='aarch64-linux'
    ;;
  *)
    echo "Unsupported architecture: ${ARCHITECTURE}" >&2
    exit 1
    ;;
esac

ARCHIVE="binaryen-version_${BINARYEN_VERSION}-${BINARYEN_TARGET}.tar.gz"
RELEASE_URL="https://github.com/WebAssembly/binaryen/releases/download/version_${BINARYEN_VERSION}"

wget "${RELEASE_URL}/${ARCHIVE}"
wget "${RELEASE_URL}/${ARCHIVE}.sha256"

sha256sum -c "${ARCHIVE}.sha256"

tar -xzf "${ARCHIVE}"

cp -r "binaryen-version_${BINARYEN_VERSION}/bin/"* /usr/local/bin/

rm -rf \
  "binaryen-version_${BINARYEN_VERSION}" \
  "${ARCHIVE}" \
  "${ARCHIVE}.sha256"
