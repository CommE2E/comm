#!/bin/bash

set -e

pushd transferred/server/cmake/build

make test ARGS="-V"

popd # transferred/server/cmake/build
