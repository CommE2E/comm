#!/usr/bin/env bash

# source as: logged in user
# source from: package.json (via npm/yarn scripts)

unset PREFIX
[ -s "/usr/local/opt/nvm/nvm.sh" ] && . "/usr/local/opt/nvm/nvm.sh" # Intel Mac
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && . "/opt/homebrew/opt/nvm/nvm.sh" # M1 Mac
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" # Ubuntu
nvm install --no-progress
