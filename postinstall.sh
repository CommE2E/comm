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
  (
    cd native/ios

    export BUNDLE_TIMEOUT="${BUNDLE_TIMEOUT:-30}"
    export IPV4_FALLBACK_ENABLED="${IPV4_FALLBACK_ENABLED:-true}"
    export MACOSX_DEPLOYMENT_TARGET=''
    DEVELOPER_DIR=$(/usr/bin/xcode-select -p)
    export DEVELOPER_DIR

    bundle install

    pod_install_exit_code=0
    bundle exec pod install --deployment || pod_install_exit_code=$?

    if [[ $pod_install_exit_code -ne 31 ]]; then
      exit "$pod_install_exit_code"
    fi

    bundle exec pod install --repo-update --deployment
  )
fi
