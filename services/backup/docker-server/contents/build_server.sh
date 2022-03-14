#!/bin/bash

set -e

# folly hack - https://github.com/facebook/folly/pull/1231
sed -i 's/#if __has_include(<demangle.h>)/#if __has_include(<Demangle.h>)/g' /usr/lib/folly/folly/detail/Demangle.h

pushd transferred/server

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

popd # transferred/server
