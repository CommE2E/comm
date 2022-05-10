#!/usr/bin/env bash
set -e

cd /tmp

git clone --recurse-submodules -b v4.3.16 --single-branch https://github.com/CopernicaMarketingSoftware/AMQP-CPP
pushd AMQP-CPP
mkdir build
pushd build
cmake .. -DAMQP-CPP_BUILD_SHARED=ON -DAMQP-CPP_LINUX_TCP=ON
cmake --build . --target install

popd # build
popd # AMQP-CPP-BUILD
rm -rf AMQP-CPP-BUILD
