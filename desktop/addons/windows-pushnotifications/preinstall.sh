#!/usr/bin/env bash

set -Eeuo pipefail

if ! [[ "$OSTYPE" == 'msys' ]]; then
  exit 1
fi

nuget install