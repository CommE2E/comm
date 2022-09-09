#!/usr/bin/env bash

set -e

# shellcheck source=/dev/null
[[ -r "$HOME"/.cargo/env ]] && source "$HOME"/.cargo/env

PATHS="services/commtest"

command -v cargo > /dev/null

for directory in $PATHS; do
  pushd "$directory"
  echo "formatting ${directory}..."
  cargo fmt --all -- --check
  echo "checking ${directory}..."
  cargo check
  popd # $directory
done

echo "done formatting"
