#!/bin/bash

set -e

. ./scripts/services_config.sh

echo "tunnelbroker service will run at port ${COMM_SERVICES_PORT_TUNNELBROKER}"
echo "backup service will run at port ${COMM_SERVICES_PORT_BACKUP}"


docker-compose build tunnelbroker-server
docker-compose build backup-server

docker-compose up
