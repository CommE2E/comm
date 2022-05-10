#!/usr/bin/env bash
set -e

cd /tmp

git clone --recurse-submodules -b CRYPTOPP_8_6_0 --single-branch https://github.com/weidai11/cryptopp
pushd cryptopp
mkdir build
CXXFLAGS="-DNDEBUG -g2 -O3 -std=c++11"
make
make libcryptopp.pc
make install

popd # cryptopp
rm -rf cryptopp
