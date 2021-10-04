#!/bin/bash

set -e

echo "building the server..."

pushd cmake/build
cmake ../..
make -j

popd

echo "success - server built"
