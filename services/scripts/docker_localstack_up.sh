#!/usr/bin/env bash

set -e

# Start services
comm-dev services start

# Disable Nix-based localstack by checking for "localstack_main" container
if docker ps | grep localstack_main &> /dev/null; then
  echo "Disabling Nix-based localstack..." >&2
  bash ../scripts/localstack_down.sh
else
  echo "Nix-based localstack is already disabled, skipping shutdown"
fi

# Start Docker Compose-based localstack
if ! docker ps | grep localstack &> /dev/null; then
  echo "Starting Docker compose-based localstack..." >&2
  yarn init-local-cloud
else
  echo "Docker compose-based localstack is already running, skipping localstack initialization"
fi
