#!/usr/bin/env bash

set -euo pipefail

COMM_CACHE="${XDG_CACHE_HOME:-$HOME/Library/Caches}/app.comm"
mkdir -p "$COMM_CACHE"
COMM_DIRENV="$COMM_CACHE/install-direnv"

if command -v direnv >/dev/null || [[ -s "$COMM_DIRENV" ]]; then
  # Already using direnv or anwsered no previously. Exit immediately.
  exit 0
fi

# Currently, this script only works on macOS as it assumes homebrew usage
if ! [[ "$OSTYPE" == 'darwin'* ]]; then
  echo "This script is only meant to be ran on macOS" >&2
  exit 1
fi

# Check if in an interactive shell
# `test -t` tests if a file descriptor is open, 0 being stdin
# Normally, a non-interactive shell will not have 0 FD bound
# However, Buildkite still has 0 FD bound, so check if PS1 is empty
if [[ ! -t 0 ]] || [[ -z "$PS1" ]]; then
  exit 0
fi

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
# Default version on macOS is bash 3.2. Output taken from '/bin/bash --version'
# shellcheck disable=SC2076
if [[ "$(bash --version)" =~ "GNU bash, version 3.2" ]]; then
  brew install bash
fi

# Install the hook for a given shell in the related file.
install_direnv_hook() {
  local shell="$1"
  local source_file="$2"

  # Skip hook installation of shells which don't exist
  if ! command -v "$shell" >/dev/null; then
    return 0
  fi

  # If the file already mentions direnv, then hook is likely already installed
  if [[ ! -e "$source_file" ]] \
      || ! grep "direnv" "$source_file" >/dev/null; then
    # shellcheck disable=SC2016
    echo "eval \"\$(direnv hook $shell)\"" >> "$source_file"
  fi

}

# ~/.zshenv would be preferred location to install the hook, however, it
# gets sourced before ~/.zprofile for login shells; and since
# Homebrew asks you to install its hook in ~/.zprofile, we need to
# follow the same convention.
install_direnv_hook zsh ~/.zprofile
install_direnv_hook zsh ~/.zshrc
install_direnv_hook bash ~/.bash_profile
install_direnv_hook bash ~/.bashrc
