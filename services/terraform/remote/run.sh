#!/usr/bin/env bash

set -e

cd ../../search-index-lambda
cargo lambda build --arm64 --output-format zip --release
mv ./target/lambda/search-index-lambda/bootstrap.zip .

cd ../terraform/remote
terraform init
terraform apply -auto-approve
