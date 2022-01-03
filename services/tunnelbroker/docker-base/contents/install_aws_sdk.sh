#!/bin/bash

set -e

if [[ -d /usr/lib/aws-sdk-cpp ]]; then
    echo "Error: aws-sdk sources already exists, you can try remove this container/image and recreate it."
    echo "Installation skipped."
    exit 0
fi

pushd /usr/lib

git clone --recurse-submodules https://github.com/aws/aws-sdk-cpp
mkdir aws_sdk_build
pushd aws_sdk_build
cmake ../aws-sdk-cpp/ -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH=/usr/local/aws_sdk -DBUILD_ONLY="core;dynamodb"
make
make install

popd # aws_sdk_build
popd # /usr/lib
