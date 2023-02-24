#!/usr/bin/env bash

set -e

if [[ "$#" -lt 1 ]] || [[ "$#" -gt 2 ]]; then
  echo "Illegal number of arguments, expected 2:"
  echo "- one argument with a name of the service, currently available services:"
  ./scripts/list_services.sh
  echo "- one optional argument with port"
  echo "- example: ./services/scripts/run_server_image.sh tunnelbroker 12345"
  exit 1;
fi

SERVICE=$1
if [[ "$SERVICE" == "tunnelbroker" ]]; then
  if [[ -n "$2" ]]; then
    export COMM_SERVICES_PORT_TUNNELBROKER=$2
  fi
elif [[ "$SERVICE" == "backup" ]]; then
  if [[ -n "$2" ]]; then
    export COMM_SERVICES_PORT_BACKUP=$2
  fi
elif [[ "$SERVICE" == "blob" ]]; then
  if [[ -n "$2" ]]; then
    export COMM_SERVICES_PORT_BLOB=$2
  fi
elif [[ "$SERVICE" == "feature-flags" ]]; then
  if [[ -n "$2" ]]; then
    export COMM_SERVICES_PORT_FEATURE_FLAGS=$2
  fi
else
  echo "No such service ${SERVICE}, aborting"
  exit 1
fi

docker-compose build "$SERVICE"-server
docker-compose up "$SERVICE"-server
