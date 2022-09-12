#!/usr/bin/env bash

set -e

NPROC=0

NPROC=$(nproc 2> /dev/null || echo 1)
if [[ $NPROC -eq 1 ]]; then
  NPROC=$(sysctl -n hw.physicalcpu 2> /dev/null || echo 1)
fi

echo "building the server (nproc=$NPROC)..."

pushd cmake/build
# gtest is not installed, avoid building test suites
cmake ../.. -DBUILD_TESTING=OFF
make -j "$NPROC"

popd

echo "success - server built"
