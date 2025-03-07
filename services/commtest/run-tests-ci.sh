#!/bin/env bash

set -euo pipefail

NUM_FAILURES=0

awscli() {
  aws --endpoint-url="$LOCALSTACK_ENDPOINT" "$@"
}

build_lambdas() {
  echo "2Building lambdas..."

  pushd ../search-index-lambda >/dev/null

  set +o pipefail
  cargo lambda build --arm64 --output-format zip || true
  set -o pipefail

  popd >/dev/null
}

# Set up Localstack using Terraform
reset_localstack() {
  echo "Resetting Localstack..."
  pushd ../terraform/dev >/dev/null
  terraform init

  # Force delete secrets due to bug in Localstack where Terraform can't delete them
  echo "Deleting secrets..."
  secret_arns=$(awscli secretsmanager list-secrets --query "SecretList[].ARN" --output text)
  for arn in $secret_arns; do
    awscli secretsmanager delete-secret --secret-id "$arn" --force-delete-without-recovery
  done

  # Reset terraform state
  echo "Resetting terraform state..."
  terraform apply -destroy -auto-approve
  terraform apply -auto-approve

  popd >/dev/null
}

run_test() {
  local exit_code
  echo "COMMTEST: Running test: $1"

  set +e
  RUSTFLAGS=-Awarnings cargo test --test "$1" -- --show-output "${@:2}"
  exit_code=$?
  set -e

  if [ $exit_code -ne 0 ]; then
    ((NUM_FAILURES += 1))
  fi
}

# rustup default stable

echo "BEFORE Version:"
rustup --version
echo "Toolchains:"
rustup toolchain list
echo "Target:"
rustup target list --installed
echo "Default:"
rustup default
echo "Show:"
rustup show

# Build lambdas for terraform
build_lambdas

echo "AFTER Version:"
rustup --version
echo "Toolchain:"
rustup toolchain list
echo "Target:"
rustup target list --installed
echo "Default:"
rustup default
echo "Show:"
rustup show
# exit 1

# Reset localstack and then run tests
reset_localstack

run_test "blob_*"
run_test "backup*"
run_test "tunnelbroker_*" --test-threads=1
run_test grpc_client_test
# below tests are flaky and need to be run in order
run_test identity_integration_tests
run_test identity_keyserver_tests
run_test identity_access_tokens_tests
run_test identity_one_time_key_tests
run_test identity_prekey_tests
run_test identity_tunnelbroker_tests
run_test identity_device_list_tests

if [ $NUM_FAILURES -eq 0 ]; then
  echo "COMMTEST: ALL TESTS PASSED"
  exit 0
else
  echo "COMMTEST: $NUM_FAILURES TEST SUITES FAILED"
  exit 1
fi
