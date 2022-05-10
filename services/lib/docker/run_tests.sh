#!/usr/bin/env bash

set -e

pushd cmake/build
make test ARGS="-V"
popd # cmake/build
