#!/usr/bin/env bash

set -e

if [[ "$#" -gt 1 ]]; then
  echo "usage: $0 [TAG]"
  exit 1
fi


tag=${1:-"1.3.2"}

BUILDER_NAME="COMM_BUILDER"

BUILDER_PRESENT=$(docker buildx inspect "$BUILDER_NAME" 2> /dev/null || echo "")

if [[ -z "${BUILDER_PRESENT}" ]]; then
  echo "builder not found, creating builder $BUILDER_NAME";
  docker buildx create --name "$BUILDER_NAME"
fi;

docker buildx use "$BUILDER_NAME"

# use --push to automatically push this image to the hub
docker buildx build \
  --tag commapp/services-base:"${tag}" \
  -o type=image \
  --platform=linux/arm64,linux/amd64 \
  --push \
  base-image/Dockerfile
