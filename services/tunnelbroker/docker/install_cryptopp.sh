#!/bin/bash
set -e

if [[ -d /usr/lib/cryptopp ]]; then
  echo "Cryptopp sources already exists, you can try remove this container/image and recreate it."
  echo "Installation skipped."
  exit 0
fi

pushd /usr/lib

git clone --recurse-submodules -b CRYPTOPP_8_6_0 --single-branch https://github.com/weidai11/cryptopp
pushd cryptopp
mkdir build
CXXFLAGS="-DNDEBUG -g2 -O3 -std=c++11"
make
make libcryptopp.pc
make install

popd # cryptopp
popd # /usr/lib
