#!/usr/bin/env bash

# run as: node user
# run from: root of repo

set -e

. ~/.nvm/nvm.sh

chmod -R u=rwX,g=rX,o=rX .
chmod -R u=rwX,g=,o= keyserver/secrets

pushd server && nvm install && popd
yarn cleaninstall
yarn workspace web prod
yarn workspace landing prod
yarn workspace keyserver prod-build
