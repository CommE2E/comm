#!/bin/bash

# source as: logged in user
# source from: package.json (via npm/yarn scripts)

unset PREFIX
[ -s "/usr/local/opt/nvm/nvm.sh" ] && . "/usr/local/opt/nvm/nvm.sh"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install --no-progress
