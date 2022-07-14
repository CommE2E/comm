#!/usr/bin/env bash

set -e

pushd /usr/lib

git clone https://github.com/facebook/folly.git \
  --branch v2020.01.13.00 \
  --single-branch

pushd folly
cmake .
make install -l$(nproc) -j
popd # folly
rm -r folly

popd # /usr/lib
