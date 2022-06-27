#!/usr/bin/env bash

# run as: Docker host user
# run from: keyserver dir

set -e

HOST_UID=$(id -u) HOST_GID=$(id -g) docker compose "$@"
