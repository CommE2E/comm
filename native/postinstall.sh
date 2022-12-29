#!/usr/bin/env bash
set -e

# Skip Windows
if [[ "$OSTYPE" == "msys" ]]; then
  exit 0
fi

cd ../
echo '{"name": "olm", "version": "3.2.4"}' > ./node_modules/olm/package.json
yarn patch-package
yarn flow-mono create-symlinks native

cd native
yarn jetify

if [[ "$OSTYPE" == "darwin"* ]]; then
  cd ios
  PATH=/usr/bin:"$PATH" 
  pod install
  cd ../
fi