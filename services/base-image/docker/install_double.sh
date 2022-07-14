#!/usr/bin/env bash

set -euo pipefail

pushd /usr/lib

git clone https://github.com/google/double-conversion.git \
  --branch v3.1.5 --single-branch
pushd double-conversion
cmake . -DBUILD_SHARED_LIBS=ON
make install -l "$(nproc)" -j "$(nproc)"

popd # double-conversion
rm -r double-conversion

popd
