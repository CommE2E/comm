#!/bin/bash
set -e

if [[ -d /usr/lib/libuv ]]; then
  echo "Libuv sources already exists, you can try remove this container/image and recreate it."
  echo "Installation skipped."
  exit 0
fi

pushd /usr/lib

git clone --recurse-submodules -b v1.43.0 --single-branch https://github.com/libuv/libuv.git
pushd libuv
mkdir build
(cd build && cmake .. -DBUILD_TESTING=OFF)
cmake --build build

popd # libuv
popd # /usr/lib
