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

    export BUNDLE_TIMEOUT="${BUNDLE_TIMEOUT:-60}"
    export BUNDLE_RETRY="${BUNDLE_RETRY:-6}"
    export MACOSX_DEPLOYMENT_TARGET=''
    DEVELOPER_DIR=$(/usr/bin/xcode-select -p)
    export DEVELOPER_DIR

    bundle_install_attempt=1
    max_bundle_install_attempts=3
    while true; do
      if bundle install; then
        break
      fi

      bundle_install_exit_code=$?
      if [[ $bundle_install_attempt -ge $max_bundle_install_attempts ]]; then
        exit "$bundle_install_exit_code"
      fi

      sleep_seconds=$((bundle_install_attempt * 15))
      echo "bundle install failed (exit ${bundle_install_exit_code}), retrying in ${sleep_seconds}s..."
      sleep "$sleep_seconds"
      bundle_install_attempt=$((bundle_install_attempt + 1))
    done

    pod_install_exit_code=0
    bundle exec pod install --deployment || pod_install_exit_code=$?

    if [[ $pod_install_exit_code -ne 31 ]]; then
      exit "$pod_install_exit_code"
    fi

    bundle exec pod install --repo-update --deployment
  )
fi
