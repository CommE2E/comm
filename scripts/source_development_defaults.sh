#!/usr/bin/env bash

if [[ "$OSTYPE" == 'linux'* ]]; then
  export MYSQL_UNIX_PORT="${XDG_RUNTIME_DIR:-/run/user/$UID}/mysql.sock"
  export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
fi

if [[ "$OSTYPE" == 'darwin'* ]]; then
  MARIADB_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/MariaDB"
  export MYSQL_UNIX_PORT="$MARIADB_DIR"/mysql.sock
  export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
fi

# User defaults of
# https://www.rabbitmq.com/configure.html#supported-environment-variables
export RABBITMQ_NODENAME=comm
export RABBITMQ_HOME=${XDG_DATA_HOME:-$HOME/.local/share}/RabbitMQ
export RABBITMQ_MNESIA_BASE=${RABBITMQ_HOME}/mnesia
export RABBITMQ_LOG_BASE=${RABBITMQ_HOME}/logs
export RABBITMQ_LOGS=${RABBITMQ_LOG_BASE}/comm.log
export RABBITMQ_PLUGINS_EXPAND_DIR=${RABBITMQ_HOME}/plugins_expand
export RABBITMQ_PID_FILE=${RABBITMQ_HOME}/rabbitmq.pid

export PATH="$PATH":"$ANDROID_HOME"/emulator:"$ANDROID_HOME"/tools
export PATH="$PATH":"$ANDROID_HOME"/tools/bin:"$ANDROID_HOME"/platform-tools

# ANDROID_SDK_ROOT is deprecated, but it's still used by some tooling
# such as sdkmanager. ANDROID_HOME is the new prefered env var.
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"

export PATH="$PATH":./node_modules/.bin
