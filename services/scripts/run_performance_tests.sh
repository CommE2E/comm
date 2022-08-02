#!/usr/bin/env bash

set -e

SERVICES=$(./scripts/list_services.sh)

run_performance_test () {
  echo "performance tests tests will be run for the $1 service"
  # add  -- --nocapture in the end to enable logs
  cargo test "$1"_performance_test --test '*' --manifest-path=commtest/Cargo.toml #-- --nocapture
}

help () {
  echo "Usage:";
  echo "There are two arguments you can specify";
  echo "First is a target service:";
  echo "$SERVICES";
  echo "all";
  echo "Second is a number of threads that you'd like to spawn.";
  echo "It is optional, if not specified, it will fall back to a default value";
  echo "The default value is the number of CPUs";
}

if [[ -z "$1" ]]; then
  echo "No service specified" >&2
  help;
  exit 1
fi

export COMM_NUMBER_OF_THREADS="$2"

if [[ "$1" == "all" ]]; then
  for SERVICE in $SERVICES; do
    run_performance_test "$SERVICE"
  done
  exit 0;
fi;

SERVICE=$(grep "$1" <<< "$SERVICES")

if [[ "$SERVICE" != "$1" ]]; then
  echo "No such service: $1";
  help;
  exit 1;
fi;

SCRIPT_DIR=$(cd "$(dirname "$0")"; pwd -P)

set -o allexport
# shellcheck source=/dev/null
source "$SCRIPT_DIR/../.env"
set +o allexport

run_performance_test "$SERVICE"
