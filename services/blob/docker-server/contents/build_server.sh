#!/bin/bash

set -e

pushd transferred/server

rm -rf _generated
mkdir _generated

rm -rf cmake/build
mkdir -p cmake/build

./generate.sh
./build.sh

popd # transferred/server
