#!/usr/bin/env bash
set -e

cd /tmp

git clone --recurse-submodules -b v0.2.1 --single-branch https://github.com/corrosion-rs/corrosion.git
pushd corrosion
cmake -S. -Bbuild -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
cmake --install build --config Release

popd # corrosion
rm -rf corrosion
