#!/usr/bin/env bash

# Check if shell is using a default BSD, MacOS or GNU prompt
if [[ ${PS1} != '\s-\v\$'* ]] && \
    [[ ${PS1} != '\h:\W \u\$'* ]] && \
    [[ ${PS1} != '%n@%m %1~ %#'* ]]; then
  # User already has an opinionated PS1, just leave
  return 0
fi

if test "$(uname)" = "Darwin" ; then
  COMM_CACHE="${XDG_CACHE_HOME:-$HOME/Library/Caches}/app.comm"
else
  COMM_CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/comm"
fi

COMM_EMITTED_WARNING="$COMM_CACHE/powerline_warning"
# Only emit this the first time, as it's suprising to the user for the prompt
# to be replaced, but avoid emitting the warning on subsequent invocations
if [[ ! -f "$COMM_EMITTED_WARNING" ]]; then
  echo "Default prompt found, attempting to enable powerline" >&2

  # Create file to ensure it exists for next time this is run
  mkdir -p "$COMM_CACHE"
  touch "$COMM_EMITTED_WARNING"
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

  echo "Installing powerline fonts" >&2
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

  elif which fc-cache >/dev/null 2>&1 ; then
      # Reset font cache on Linux
      echo "Resetting font cache, this may take a moment..." >&2
      fc-cache -f "$font_dir"
  fi
fi

# shellcheck source=/dev/null
source "${powerline_root:-.}/share/bash/powerline.sh"
