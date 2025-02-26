#!/usr/bin/env bash

set -euo pipefail

BINARYEN_VERSION=116

wget https://github.com/WebAssembly/binaryen/releases/download/version_${BINARYEN_VERSION}/binaryen-version_${BINARYEN_VERSION}-x86_64-linux.tar.gz

tar -xzf binaryen-version_${BINARYEN_VERSION}-x86_64-linux.tar.gz

cp -r binaryen-version_${BINARYEN_VERSION}/bin/* /usr/local/bin/

rm -rf binaryen-version_${BINARYEN_VERSION} binaryen-version_${BINARYEN_VERSION}-x86_64-linux.tar.gz
