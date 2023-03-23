#!/usr/bin/env bash

set -Eeuo pipefail

# Skip Windows
if [[ "$OSTYPE" == "msys" ]]; then
  exit 0
fi

echo '{"name": "olm", "version": "3.2.4"}' > ./node_modules/olm/package.json
yarn patch-package
yarn flow-mono create-symlinks native

yarn workspace native jetify

if [[ "$OSTYPE" == "darwin"* ]]; then
  (cd native/ios && PATH=/usr/bin:/bin:"$PATH" pod install --repo-update)
fi
