#!/usr/bin/env bash

# run as: node user
# run from: keyserver dir

set -e

# shellcheck source=/dev/null
. ~/.nvm/nvm.sh
nvm exec yarn prod
