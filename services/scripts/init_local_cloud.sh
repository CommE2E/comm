#!/usr/bin/env bash

set -e

# use the commented-out command to force container recreation
# docker-compose up -d --force-recreate localstack
docker-compose up -d localstack

pushd terraform/dev

./run.sh

popd # terraform
