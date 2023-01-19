#!/usr/bin/env bash

set -e

# shellcheck source=/dev/null
[[ -r "$HOME"/.cargo/env ]] && source "$HOME"/.cargo/env

if [[ "$#" -eq 0 ]]; then
  echo "no Cargo project paths provided"
  exit 1
fi

command -v cargo > /dev/null

# iterate over all provided Cargo project paths
for directory in "$@"; do
  pushd "$directory" > /dev/null
  echo "formatting ${directory}..."
  cargo fmt --all -- --check
  echo "checking ${directory}..."
  cargo check
  popd > /dev/null # $directory
done

echo "done formatting"
