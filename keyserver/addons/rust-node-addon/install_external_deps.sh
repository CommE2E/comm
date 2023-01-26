#!/usr/bin/env bash

set -eo pipefail

# We can skip this script if it's not part of a CI workflow
if [[ -z "$BUILDKITE" ]] && [[ -z "$CI" ]];
then
  echo "Not in a CI workflow, exiting" >&2
  exit
fi

# Install protobuf if it's not already installed
if ! command -v protoc >/dev/null;
then
  echo "Installing protobuf"
  SCRIPT_DIR=$(cd "$(dirname "$0")"; pwd -P)
  bash "${SCRIPT_DIR}/../../../scripts/install_protobuf.sh"
fi
