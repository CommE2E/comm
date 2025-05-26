#!/usr/bin/env bash

set -Eeuo pipefail

# Skip Windows
if [[ "$OSTYPE" == "msys" ]]; then
  exit 0
fi

echo '{"name": "olm", "version": "0.2.5"}' > ./node_modules/olm/package.json
yarn patch-package
yarn flow-mono create-symlinks native

yarn workspace native jetify

if [[ "$OSTYPE" == "darwin"* ]]; then
  (cd native/ios && PATH=/usr/bin:/bin:"$PATH" bundle install && PATH=/usr/bin:/bin:"$PATH" MACOSX_DEPLOYMENT_TARGET='' bundle exec pod install --repo-update)
fi
