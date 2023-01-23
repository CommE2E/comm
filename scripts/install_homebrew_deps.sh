#!/usr/bin/env bash

set -euo pipefail

if ! command -v brew >/dev/null; then
  echo "Homebrew is required to run this script" >&2
  exit 1
fi

install_if_missing() {
  local package="$1"

  if ! command -v "$package" >/dev/null; then
    brew install "$package"
  fi
}

for dep in "$@"; do
  install_if_missing "$dep"
done
