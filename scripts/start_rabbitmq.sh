#!/usr/bin/env bash

set -eou pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")"; pwd -P)

source "${SCRIPT_DIR}/source_development_defaults.sh"

# RabbitMQ is mostly configured through environment variables
# located in scripts/source_development_defaults.sh
mkdir -p "$RABBITMQ_LOG_BASE"

echo "View RabbitMQ logs: tail -f $RABBITMQ_LOGS" >&2
echo "Kill RabbitMQ server: pkill rabbitmq-server beam.smp" >&2

# 'exec' allows for us to replace bash process with RabbitMQ
exec "rabbitmq-server" > "$RABBITMQ_LOG_BASE/startup.log"
