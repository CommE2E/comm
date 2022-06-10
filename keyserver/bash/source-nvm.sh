#!/usr/bin/env bash

# source as: logged in user
# source from: package.json (via npm/yarn scripts)

unset PREFIX
# Intel Mac
[ -s "/usr/local/opt/nvm/nvm.sh" ] && . "/usr/local/opt/nvm/nvm.sh"
# ARM-based Mac
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && . "/opt/homebrew/opt/nvm/nvm.sh"
# Ubuntu
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install --no-progress
