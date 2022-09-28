#!/usr/bin/env bash

set -euo pipefail

# Since docker is installed outside of nix, need to ensure that it was
# installed impurely
if ! command -v docker > /dev/null; then
  echo "Please install docker" >&2
  exit 1
fi

# The 'localstack status' command will poll foever if you have a newer
# docker cli, so instead use docker ps + grep to determine running container
if docker ps | grep localstack &> /dev/null; then
  echo "Stopping localstack..." >&2
  docker stop localstack_main > /dev/null
else
  echo "No localstack instance found, skipping..."
fi
