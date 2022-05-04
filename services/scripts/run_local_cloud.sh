#!/bin/bash

set -e

# use the commented-out command to force container recreation
# docker-compose up -d --force-recreate localstack
docker-compose up -d localstack

pushd terraform

./run.sh

popd # terraform
