#!/bin/bash

set -e

. ./scripts/services_config.sh

docker-compose build $1
