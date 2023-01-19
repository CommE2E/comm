#!/usr/bin/env bash

set -euo pipefail

# Currently, this script only works on macOS as it assumes homebrew usage
if ! [[ "$OSTYPE" == 'darwin'* ]]; then
  echo "This script is only meant to be ran on macOS" >&2
  exit 1
fi

if ! command -v brew >/dev/null; then
  echo "Installing Homebrew..." >&2

  bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
