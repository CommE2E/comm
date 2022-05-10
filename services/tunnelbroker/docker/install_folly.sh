#!/usr/bin/env bash

set -e

pushd /usr/lib

git clone https://github.com/facebook/folly.git --branch v2020.01.13.00 --single-branch
git clone https://github.com/google/glog.git --branch v0.4.0 --single-branch
git clone https://github.com/google/double-conversion.git --branch  v3.1.5 --single-branch

popd # /usr/lib
