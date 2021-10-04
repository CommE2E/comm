#!/bin/bash

set -e

echo "building the server..."

pushd cmake/build
cmake ../..
make -j 2> /dev/null || (echo "failed to make with -j option, falling back to slower compilation" && make)

popd

echo "success - server built"
