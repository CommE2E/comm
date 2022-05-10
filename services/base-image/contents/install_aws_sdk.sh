#!/usr/bin/env bash

set -e

cd /tmp

git clone --recurse-submodules -b 1.9.176 --single-branch https://github.com/aws/aws-sdk-cpp
mkdir aws-sdk-cpp/build
pushd aws-sdk-cpp/build
cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH=/usr/local/aws_sdk -DBUILD_ONLY="core;s3;dynamodb"
make
make install

popd # aws-sdk-cpp/build
rm -rf aws-sdk-cpp
