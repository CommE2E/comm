#!/usr/bin/env bash

set -e

find . -maxdepth 1 \
  -type d \
  ! -name "base-image" \
  ! -name "docker-compose.yml" \
  ! -name "package.json" \
  ! -name "scripts" \
  ! -name "node_modules" \
  ! -name "commtest" \
  ! -name "lib" \
  ! -name "terraform" \
  ! -name "comm-services-lib" \
  ! -name ".*" \
  -print0 | xargs -0 -n1 basename

