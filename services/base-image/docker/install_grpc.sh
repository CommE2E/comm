#!/usr/bin/env bash

set -e

echo "installing grpc..."

cd /tmp

git clone \
  --recurse-submodules \
  --single-branch \
  -b v1.39.1 \
  https://github.com/grpc/grpc

pushd grpc
mkdir -p cmake/build
pushd cmake/build
cmake \
	-DgRPC_INSTALL=ON \
  -DgRPC_SSL_PROVIDER=package \
  -DgRPC_ZLIB_PROVIDER=package \
	-DgRPC_BUILD_TESTS=OFF \
	-DgRPC_BUILD_CSHARP_EXT=OFF \
	-DgRPC_BUILD_GRPC_CPP_PLUGIN=ON \
	-DgRPC_BUILD_GRPC_CSHARP_PLUGIN=OFF \
	-DgRPC_BUILD_GRPC_NODE_PLUGIN=OFF \
	-DgRPC_BUILD_GRPC_OBJECTIVE_C_PLUGIN=OFF \
	-DgRPC_BUILD_GRPC_PHP_PLUGIN=OFF \
	-DgRPC_BUILD_GRPC_PYTHON_PLUGIN=OFF \
	-DgRPC_BUILD_GRPC_RUBY_PLUGIN=OFF \
	../..
make install -j$(nproc) -l$(nproc)
popd # cmake/build

# Explicitly install abseil-cpp because of https://github.com/grpc/grpc/issues/25949
# This should be removed after upgrading to v1.41
pushd third_party/abseil-cpp/
mkdir -p cmake/build
pushd cmake/build
cmake \
		-DCMAKE_POSITION_INDEPENDENT_CODE=TRUE \
		../..
make install -j$(nproc) -l$(nproc)
popd # cmake/build
popd # third_party/abseil-cpp/

# Explicitly install a more up-to-date version of protobuf, which
# installs protobuf-config.cmake. The `libprotobuf-dev` Ubuntu package
# only exports the pkg-config protobuf.pc. This is important because grpc's
# cmake will attempt to find protobuf's cmake configuration.
pushd third_party/protobuf/
mkdir -p _build
pushd _build
cmake ../cmake -Dprotobuf_BUILD_SHARED_LIBS=ON -Dprotobuf_ABSL_PROVIDER=package
make install -j$(nproc) -l$(nproc)
popd # _build
popd # third_party/protobuf/

popd # grpc

rm -rf grpc
