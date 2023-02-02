#!/usr/bin/env bash

set -euo pipefail

git clone \
  --recurse-submodules \
  --single-branch \
  -b v3.15.8 \
  https://github.com/protocolbuffers/protobuf

pushd protobuf || exit

mkdir cmake-build
pushd cmake-build || exit

cmake ../cmake \
  -Dprotobuf_BUILD_SHARED_LIBS=ON \
  -Dprotobuf_ABSL_PROVIDER=package \
  -Dprotobuf_BUILD_TESTS=OFF

make install -j "$(nproc)" -l "$(nproc)"

popd || exit # cmake-build
popd || exit # protobuf

rm -rf protobuf
