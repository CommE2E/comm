#!/bin/bash

set -e

if [[ -d /usr/lib/aws-sdk-cpp ]]
then
    echo "aws-sdk already exists, skipping installation(if the installation seems to be broken, remove this container/image and recreate it)..."
    exit 0;
fi

pushd /usr/lib

git clone --recurse-submodules https://github.com/aws/aws-sdk-cpp
mkdir aws_sdk_build
pushd aws_sdk_build
cmake ../aws-sdk-cpp/ -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH=/usr/local/aws_sdk -DBUILD_ONLY="core;s3;dynamodb"
make
make install

popd # aws_sdk_build
popd # /usr/lib
