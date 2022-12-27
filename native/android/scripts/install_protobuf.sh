#!/usr/bin/env bash

git clone \
  --recurse-submodules \
  --single-branch \
  -b v3.15.8 \
  https://github.com/protocolbuffers/protobuf

pushd protobuf || exit

mkdir build
pushd build || exit

cmake ../cmake -Dprotobuf_BUILD_SHARED_LIBS=ON -Dprotobuf_ABSL_PROVIDER=package
sudo make install -j "$(nproc)" -l "$(nproc)"

popd || exit # build
popd || exit # protobuf
