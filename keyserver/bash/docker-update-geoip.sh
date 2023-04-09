#!/usr/bin/env bash

# run as: Docker container user
# run from: keyserver dir

set -e

if [[ "$COMM_JSONCONFIG_secrets_geoip_license" ]]; then
  # shellcheck source=/dev/null
  . bash/source-nvm.sh
  node node_modules/geoip-lite/scripts/updatedb.js license_key="$( \
    # shellcheck disable=SC2001,SC2027,SC2086
    echo ""$COMM_JSONCONFIG_secrets_geoip_license"" \
      | sed 's/{\"key\":\"\([a-zA-Z0-9]*\)\"}/\1/' \
  )"
fi
