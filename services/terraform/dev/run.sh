#!/usr/bin/env bash

set -e

cd ../../search-index-lambda
cargo lambda build --arm64 --output-format zip --release

cd ../terraform/dev

terraform init

terraform apply -auto-approve
