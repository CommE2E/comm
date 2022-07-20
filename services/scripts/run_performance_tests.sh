#!/usr/bin/env bash

set -e

SERVICES=$(./scripts/list_services.sh)

run_performance_test () {
  echo "performance tests tests will be run for the $1 service"
  # add  -- --nocapture in the end to enable logs
  cargo test "$1"_performance_test --test '*' --manifest-path=commtest/Cargo.toml #-- --nocapture
}

list_expected () {
  echo "Expected one of these:";
  echo "$SERVICES";
  echo "all";
}

if [[ -z "$1" ]]; then
  echo "No service specified" >&2
  list_expected;
  exit 1
fi

if [[ "$1" == "all" ]]; then
  for SERVICE in "$SERVICES"; do
    run_performance_test "$SERVICE"
  done
  exit 0;
fi;

SERVICE=$(grep "$1" <<< "$SERVICES")

if [[ "$SERVICE" != "$1" ]]; then
  echo "No such service: $1";
  list_expected;
  exit 1;
fi;

SCRIPT_DIR=$(cd "$(dirname "$0")"; pwd -P)

set -o allexport
source "$SCRIPT_DIR/../.env"
set +o allexport

run_performance_test "$SERVICE"
