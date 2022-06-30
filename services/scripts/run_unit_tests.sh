#!/usr/bin/env bash

set -e

export COMM_TEST_SERVICES=1
export COMM_SERVICES_DEV_MODE=1

SERVICES=$(./scripts/list_services.sh)

run_unit_test () {
  echo "unit tests will be run for the $1 service"

  docker-compose build "$1"-server
  docker-compose run "$1"-server
}

list_expected () {
  echo "Expected one of these:";
  echo "$SERVICES";
}

if [[ -z "$1" ]]; then
  echo "No service specified";
  list_expected;
  exit 1;
fi

if [[ "$1" == "all" ]]; then
  for SERVICE in $SERVICES; do
    run_unit_test "$SERVICE"
  done
  exit 0;
fi;

SERVICE=$(grep "$1" <<< "$SERVICES")

if [[ "$SERVICE" != "$1" ]]; then
  echo "No such service: $1";
  list_expected;
  exit 1;
fi;

run_unit_test "$SERVICE"
