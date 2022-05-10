#!/usr/bin/env bash
set -e

cd /tmp

git clone --recurse-submodules -b v1.43.0 --single-branch https://github.com/libuv/libuv.git
pushd libuv
mkdir build
cd build
cmake .. -DBUILD_TESTING=OFF
make
make install

popd # libuv
rm -rf libuv
