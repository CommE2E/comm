#!/usr/bin/env bash

set -e

# Install protobuf if it's not already installed
if [[ ! "$(command -v protoc)" ]]
then
  echo "Installing protobuf"
  . ../../../scripts/install_protobuf.sh
fi
