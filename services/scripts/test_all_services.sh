#!/usr/bin/env bash

set -e

SERVICES=`./scripts/list_services.sh`

for SERVICE in $SERVICES; do
  ./scripts/test_service.sh $SERVICE
done
