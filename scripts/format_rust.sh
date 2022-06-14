#!/usr/bin/env bash

set -e

source $HOME/.cargo/env 

PATHS="services/commtest services/identity"

cargo > /dev/null

for PATH in $PATHS; do
  echo "formatting $PATH..."
  cargo fmt --manifest-path=$PATH/Cargo.toml
done

echo "done formatting"
