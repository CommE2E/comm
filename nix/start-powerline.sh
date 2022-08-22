#!/usr/bin/env bash

# Check if in an interactive shell
# `test -t` tests if a file descriptor is open, 0 being stdin
# Normally, a non-interactive shell will not have 0 FD bound
# However, Buildkite still has 0 FD bound, so check if PS1 is empty
if [[ ! -t 0 ]] || [[ -z "$PS1" ]]; then
  return 0
fi

if test "$(uname)" = "Darwin" ; then
  COMM_CACHE="${XDG_CACHE_HOME:-$HOME/Library/Caches}/app.comm"
else
  COMM_CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/comm"
fi

mkdir -p "$COMM_CACHE"
COMM_POWERLINE="$COMM_CACHE/enable-powerline"

# Only emit this the first time, as it's suprising to the user for the prompt
# to be replaced, but avoid emitting the warning on subsequent invocations
if [[ ! -e "${COMM_POWERLINE}" ]]; then
  read -r \
    -p "Would you like to enable Powerline as the default bash prompt? [y/N] " \
    response
  case "$response" in
    [yY][eE][sS]|[yY])
      echo "1" > "${COMM_POWERLINE}"
      ;;
    *)
      touch "${COMM_POWERLINE}"
      ;;
  esac
fi

# If empty, user want's to use native prompt
if [[ ! -s "${COMM_POWERLINE}" ]]; then
  return 0
fi

# Check if the powerline fonts are installed
# If the font is missing then many of the glyphs will render as ?
# Adapted from https://github.com/powerline/fonts/blob/master/install.sh
if test "$(uname)" = "Darwin" ; then
  # MacOS
  font_dir="$HOME/Library/Fonts"
else
  # Linux
  font_dir="${XDG_DATA_HOME:-$HOME/.local/share}/fonts"
  mkdir -p "$font_dir"
fi

if [[ ! -f "$font_dir/Droid Sans Mono for Powerline.otf" ]]; then
  if [[ ! -d "${powerline_fonts:-/doesnt-exist}" ]]; then
    echo "Unable to determine powerline fonts location" >&2
    return 1
  fi

  echo "Installing Powerline fonts" >&2
  find "$powerline_fonts" \
    \( -name "*.[ot]tf" -or -name "*.pcf.gz" \) -type f -print0 \
    | xargs -0 -n1 -I % cp "%" "$font_dir/"

  if test "$(uname)" = "Darwin" ; then

    if [[ "$TERM_PROGRAM" == "Apple_Terminal" ]]; then
      echo "For glyph support, please:
  Select Terminal > Preferences > Text > Font > Change > \
Select font with 'for Powerline' in the name" >&2
    elif [[ "$TERM_PROGRAM" == "iTerm.app" ]]; then
      echo "For glyph support, please:
  Select iTerm2 > Preferences > Profiles > Text > Font > \
Select font with 'for Powerline' in the name" >&2
    fi

  elif command -v fc-cache ; then
      # Reset font cache on Linux
      echo "Resetting font cache, this may take a moment..." >&2
      fc-cache -f "$font_dir"
  fi
fi

# shellcheck source=/dev/null
source "${powerline_root:-.}/share/bash/powerline.sh"
