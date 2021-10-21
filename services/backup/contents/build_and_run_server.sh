#!/bin/bash

set -e

cd transferred/server

rm -rf _generated
mkdir _generated

rm -rf cmake/build
mkdir -p cmake/build

./generate.sh
./build.sh
./cmake/build/bin/backup
