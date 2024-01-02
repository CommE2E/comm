#!/usr/bin/env bash

set -e

# Start services
comm-dev services start

# Disable Nix-based localstack
bash ../scripts/localstack_down.sh

# Start Docker Compose-based localstack
yarn init-local-cloud
