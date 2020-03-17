#!/bin/bash

# run as: node user
# run from: server dir

set -e

. ~/.nvm/nvm.sh
nvm exec npm run prod
