#!/usr/bin/env bash

set -e

SERVICES_LIST=`./scripts/list_services.sh`
SERVICES=""
for SERVICE in $SERVICES_LIST; do
  SERVICES="$SERVICES $SERVICE-server"
done

docker-compose up $SERVICES
