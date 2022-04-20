#!/usr/bin/env bash

set -e

SERVICES=`./scripts/list_services.sh`
SERVICE=`echo "$SERVICES" | grep $1` || echo "No such service: $1"

if [ "$SERVICE" != "$1" ]; then
  echo "Expected one of these:"
  echo "$SERVICES"
  exit 1;
fi;

export COMM_TEST_SERVICES=1

echo "${SERVICE} service will be tested"

docker-compose build ${SERVICE}-server
docker-compose run ${SERVICE}-server
