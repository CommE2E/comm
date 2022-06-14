#!/usr/bin/env bash

set -e

export COMM_TEST_SERVICES=1
export COMM_SERVICES_DEV_MODE=1

SERVICES=`./scripts/list_services.sh`

run_integration_test () {
  echo "integration tests tests will be run for the $1 service"
  COMM_TEST_TARGET=$1 cargo test $1_test --test '*' --manifest-path=commtest/Cargo.toml
}

list_expected () {
  echo "Expected one of these:";
  echo "$SERVICES";
}

if [ -z "$1" ]; then
  echo "No service specified";
  list_expected;
  exit 1;
fi

if [ "$SERVICE" == "all" ]; then
  for SERVICE in $SERVICES; do
    run_integration_test $SERVICE
  done
  exit 0;
fi;

SERVICE=`echo "$SERVICES" | grep $1`

if [ "$SERVICE" != "$1" ]; then
  echo "No such service: $1";
  list_expected;
  exit 1;
fi;

run_integration_test $SERVICE
