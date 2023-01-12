#!/usr/bin/env bash

set -e

echo "Buildkite var set: $BUILDKITE"

# We can skip this script if it's not part of a CI workflow
if ! { [ -n "$BUILDKITE" ] || [ -n "$CI" ]; }
then
  echo "Not in a CI workflow, exiting"
  exit
fi

# Install protobuf if it's not already installed
if [[ ! "$(command -v protoc)" ]]
then
  echo "Installing protobuf"
  . ../../../scripts/install_protobuf.sh
fi
