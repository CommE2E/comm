#!/usr/bin/env bash

if [[ "$OSTYPE" == 'linux'* ]]; then
  export MYSQL_UNIX_PORT=${XDG_RUNTIME_DIR:-/run/user/$UID}/mysql.sock
  export ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}
fi

if [[ "$OSTYPE" == 'darwin'* ]]; then
  MARIADB_DIR=${XDG_DATA_HOME:-$HOME/.local/share}/MariaDB
  export MYSQL_UNIX_PORT="$MARIADB_DIR"/mysql.sock
  export ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}
fi

export PATH=$PATH:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/tools
export PATH=$PATH:$ANDROID_SDK_ROOT/tools/bin:$ANDROID_SDK_ROOT/platform-tools
