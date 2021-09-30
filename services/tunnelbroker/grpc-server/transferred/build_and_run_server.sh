#!/bin/bash

set -e

cd transferred/server

rm -rf lib
mkdir lib
pushd lib
ln -s /usr/lib/folly
ln -s /usr/lib/glog
ln -s /usr/lib/double-conversion
popd # lib

rm -rf _generated
mkdir _generated

rm -rf cmake/build
mkdir -p cmake/build

./generate.sh
./build.sh
./cmake/build/bin/tunnelbroker
