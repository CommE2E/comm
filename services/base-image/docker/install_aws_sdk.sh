#!/usr/bin/env bash

set -e

cd /tmp

git clone https://github.com/aws/aws-sdk-cpp \
  --recurse-submodules \
  -b 1.9.176 \
  --single-branch

mkdir aws-sdk-cpp/build
pushd aws-sdk-cpp/build
cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_PREFIX_PATH=/usr/local/aws_sdk \
  -DBUILD_ONLY="core;s3;dynamodb"
make install -l$(nproc) -j

popd # aws-sdk-cpp/build
rm -rf aws-sdk-cpp
