#!/bin/bash
set -e

if [[ -d /usr/lib/AMQP-CPP ]]; then
    echo "Error: amqp-cpp sources already exists, you can try remove this container/image and recreate it."
    echo "Installation skipped."
    exit 0
fi

pushd /usr/lib

git clone --recurse-submodules https://github.com/CopernicaMarketingSoftware/AMQP-CPP
pushd AMQP-CPP
cmake . -DAMQP-CPP_BUILD_SHARED=ON -DAMQP-CPP_LINUX_TCP=ON
cmake --build . --target install

popd # /usr/lib
