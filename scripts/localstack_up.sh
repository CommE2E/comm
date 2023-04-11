#!/usr/bin/env bash

set -euo pipefail

# Avoid localstack attempt to write in the nix store
XDG_DATA_HOME=''${XDG_DATA_HOME:-$HOME/.local/share}
export FILESYSTEM_ROOT=''${XDG_DATA_HOME}/localstack/filesystem

# Since docker is installed outside of nix, need to ensure that it was
# installed impurely
if ! command -v docker > /dev/null; then
  echo "Please install docker in order to use localstack" >&2
  exit 1
fi

if ! command -v localstack > /dev/null; then
  echo "Please install localstack cli in order to use localstack" >&2
  exit 1
fi

if [[ $(docker info 2>/dev/null) =~ "Cannot connect to the Docker" ]]; then
  echo "Localstack requires docker, please start docker and try again" >&2
  exit 1
fi

# The 'localstack status' command will poll forever if you have a newer
# docker cli, so instead use docker ps + grep to determine running container
if ! docker ps | grep localstack &> /dev/null; then
  echo "Starting localstack..." >&2
  localstack start \
    --detached \
    --docker \
    --no-banner > /dev/null
else
  echo "localstack is already running, skipping localstack initialization"
fi

# Explicitly exit this script so the parent shell can determine
# when it's safe to return control of terminal to user
exit 0
