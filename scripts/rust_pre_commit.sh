#!/usr/bin/env bash

set -e

source $HOME/.cargo/env 

PATHS="services/commtest"

cargo > /dev/null

for PATH in $PATHS; do
  pushd $PATH
  echo "formatting $PATH..."
  cargo fmt --all -- --check
  echo "checking $PATH..."
  cargo check
  popd # $PATH
done

echo "done formatting"
