#!/bin/env bash

set -euo pipefail

# Set up Localstack using Terraform
reset_localstack() {
  echo "Resetting Localstack..."
  pushd ../terraform/dev >/dev/null
  terraform init
  terraform apply -destroy -auto-approve
  terraform apply -auto-approve
  popd >/dev/null
}

run_test() {
  echo "Running test: $1"
  RUSTFLAGS=-Awarnings cargo test --test "$1" -- --show-output
}

# Reset localstack and then run tests
reset_localstack
run_test "blob_*"
run_test backup_integration_test
run_test backup_performance_test
# run_test grpc_client_test
# run_test tunnelbroker_integration_tests
# run_test tunnelbroker_persist_tests
# run_test identity_access_tokens_tests
# run_test identity_keyserver_tests
# run_test identity_one_time_key_tests
# run_test identity_prekey_tests
# run_test identity_tunnelbroker_tests
