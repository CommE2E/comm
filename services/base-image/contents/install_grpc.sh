#!/bin/bash

set -e

echo "installing grpc..."

if [[ -d /usr/lib/grpc ]]
then
    echo "grpc already exists, skipping installation(if the installation seems to be broken, remove this container/image and recreate it)..."
    exit 0;
fi

pushd /usr/lib
git clone --recurse-submodules -b v1.39.1 https://github.com/grpc/grpc
pushd grpc
mkdir -p cmake/build
pushd cmake/build
cmake -DgRPC_INSTALL=ON \
      -DgRPC_BUILD_TESTS=OFF \
      ../..
make
make install
popd # cmake/build

pushd third_party/abseil-cpp/
mkdir -p cmake/build
pushd cmake/build
cmake ../..
make
make install
popd # cmake/build
popd # third_party/abseil-cpp/

popd # grpc
popd # /usr/lib
