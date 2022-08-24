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

# User defaults of
# https://www.rabbitmq.com/configure.html#supported-environment-variables
export RABBITMQ_NODENAME=comm
export RABBITMQ_HOME=${XDG_DATA_HOME:-$HOME/.local/share}/RabbitMQ
export RABBITMQ_MNESIA_BASE=${RABBITMQ_HOME}/mnesia
export RABBITMQ_LOG_BASE=${RABBITMQ_HOME}/logs
export RABBITMQ_LOGS=${RABBITMQ_LOG_BASE}/comm.log
export RABBITMQ_PLUGINS_EXPAND_DIR=${RABBITMQ_HOME}/plugins_expand
export RABBITMQ_PID_FILE=${RABBITMQ_HOME}/rabbitmq.pid
