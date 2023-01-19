#!/usr/bin/env bash

set -euo pipefail

if command -v direnv >/dev/null; then
  # Already using direnv, exit immediately
  exit 0
fi

# Currently, this script only works on macOS as it assumes homebrew usage
if ! [[ "$OSTYPE" == 'darwin'* ]]; then
  echo "This script is only meant to be ran on macOS" >&2
  exit 1
fi

COMM_CACHE="${XDG_CACHE_HOME:-$HOME/Library/Caches}/app.comm"
mkdir -p "$COMM_CACHE"

COMM_DIRENV="$COMM_CACHE/install-direnv"

if [[ ! -e "${COMM_DIRENV}" ]]; then
    echo "Direnv is a tool which will automatically setup the development environment upon entering the comm/ directory."
    read -r \
    -p "Would you like to install direnv? [y/N]" \
    response
  case "$response" in
    [yY][eE][sS]|[yY])
      echo "1" > "${COMM_DIRENV}"
      ;;
    *)
      touch "${COMM_DIRENV}"
      exit 1
      ;;
  esac
fi

brew install direnv

# A more recent version of bash is required for nix-direnv to work correctly
# shellcheck disable=SC2076
if [[ "$(bash --version)" =~ "GNU bash, version 3.2" ]]; then
  brew install bash
fi

# ~/.zshenv would be preferred location to install the hook, however, it
# gets sourced before ~/.zprofile for login shells; and since
# Homebrew asks you to install its hook in ~/.zprofile, we need to
# follow the same convention.
if [[ ! -e ~/.zprofile ]] \
    || ! grep 'direnv hook zsh' ~/.zprofile >/dev/null; then
  # shellcheck disable=SC2016
  echo 'eval "$(direnv hook zsh)"' >> ~/.zprofile
fi

echo ""
echo "Please open a new terminal window for direnv effects to apply" >&2
echo ""
echo "If you would prefer to use direnv with a shell other than zsh, please follow the instructions at https://direnv.net/docs/hook.html"
echo ""
