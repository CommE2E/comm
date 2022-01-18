#!/bin/bash
set -e

if [[ -d /usr/lib/AMQP-CPP ]]; then
  echo "AMQP-CPP sources already exists, you can try remove this container/image and recreate it."
  echo "Installation skipped."
  exit 0
fi

pushd /usr/lib

git clone --recurse-submodules -b v4.3.16 --single-branch https://github.com/CopernicaMarketingSoftware/AMQP-CPP
pushd AMQP-CPP
mkdir build
pushd build
cmake .. -DAMQP-CPP_BUILD_SHARED=ON -DAMQP-CPP_LINUX_TCP=ON
cmake --build . --target install

popd # build
popd # AMQP-CPP-BUILD
popd # /usr/lib
