#!/usr/bin/env bash

set -e

pushd /usr/lib
git clone https://github.com/google/glog.git --branch v0.4.0 --single-branch

pushd glog
cmake . -DBUILD_TESTING=OFF
make install -j "$(nproc)" -l "$(nproc)"
popd # glog

rm -rf glog

popd # /usr/lib
