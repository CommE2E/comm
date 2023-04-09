#!/usr/bin/env bash

# run as: Docker container user
# run from: anywhere

set -eo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")"; pwd -P)

if [[ -n "${COMM_JSONCONFIG_secrets_geoip_license-}" ]]; then
  . "${SCRIPT_DIR}/source-nvm.sh"
  node "${SCRIPT_DIR}/../node_modules/geoip-lite/scripts/updatedb.js" \
    license_key="$(
      # shellcheck disable=SC2001
      echo "${COMM_JSONCONFIG_secrets_geoip_license}" |
        sed 's/{\"key\":\"\([a-zA-Z0-9]*\)\"}/\1/'
    )"
fi
