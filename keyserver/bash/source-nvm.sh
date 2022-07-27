#!/usr/bin/env sh

# source as: logged in user
# source from: package.json (via npm/yarn scripts)

unset PREFIX

# Nix controls the version of node within the development shell
[ -n "$IN_NIX_SHELL" ] && return 0

# Intel Mac
[ -s "/usr/local/opt/nvm/nvm.sh" ] && . "/usr/local/opt/nvm/nvm.sh"
# ARM-based Mac
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && . "/opt/homebrew/opt/nvm/nvm.sh"
# Ubuntu
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install --no-progress
