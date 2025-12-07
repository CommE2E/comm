#!/usr/bin/env bash

set -Eeuo pipefail

# Skip Windows
if [[ "$OSTYPE" == "msys" ]]; then
  exit 0
fi

yarn patch-package
yarn flow-mono create-symlinks native

yarn workspace native jetify

if [[ "$OSTYPE" == "darwin"* ]]; then
  (cd native/ios && bundle install && MACOSX_DEPLOYMENT_TARGET='' DEVELOPER_DIR=$(/usr/bin/xcode-select -p) bundle exec pod install --repo-update)
fi
