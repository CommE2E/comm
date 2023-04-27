#!/usr/bin/env bash

set -Eeuo pipefail

if ! [[ "$OSTYPE" == 'msys' ]]; then
  exit 0
fi

nuget install
