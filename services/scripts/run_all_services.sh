#!/bin/bash

set -e

. ./scripts/services_config.sh

echo "tunnelbroker service will run at port ${COMM_SERVICES_PORT_TUNNELBROKER}"
echo "backup service will run at port ${COMM_SERVICES_PORT_BACKUP}"
echo "blob service will run at port ${COMM_SERVICES_PORT_BLOB}"

SERVICES_LIST=`./scripts/list_services.sh`
SERVICES=""
for SERVICE in $SERVICES_LIST; do
  SERVICES="$SERVICES $SERVICE-server"
done

docker-compose up $SERVICES
