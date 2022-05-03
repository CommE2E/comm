#!/bin/bash

# run as: node user
# run from: keyserver dir

set -e

. ~/.nvm/nvm.sh
nvm exec npm run prod
