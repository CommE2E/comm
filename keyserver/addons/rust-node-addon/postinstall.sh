#!/usr/bin/env bash

set -Eeuo pipefail

# Skip Windows
echo "RUNNER_OS=${RUNNER_OS:-} OSTYPE=$OSTYPE"
if [[ "$OSTYPE" == msys* || "$OSTYPE" == cygwin* ]]; then
  exit 0
fi

yarn build:debug
