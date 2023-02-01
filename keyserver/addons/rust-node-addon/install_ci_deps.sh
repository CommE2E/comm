#!/usr/bin/env bash

set -eo pipefail

# We can skip this script if it's not part of a Buildkite workflow
if [[ -z "$BUILDKITE" ]];
then
  exit
fi

# Install protobuf if it's not already installed
if ! command -v protoc >/dev/null;
then
  echo "Installing protobuf"
  SCRIPT_DIR=$(cd "$(dirname "$0")"; pwd -P)
  bash "${SCRIPT_DIR}/../../../scripts/install_protobuf.sh"
fi
