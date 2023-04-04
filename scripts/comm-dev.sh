#! /usr/bin/env bash

# This is an entry for common development workflows like starting and stopping
# expensive services

set -euo pipefail

COMM_ROOT="$(git rev-parse --show-toplevel)"

log() {
  echo "$@" >&2
}

usage() {
  echo "Comm Development"
  echo ""
  echo "Commands:"
  echo "  services - start or stop development services"
  echo "  db - restart MariaDB server"
  echo ""

  exit 1
}

services_usage() {
  echo "Comm Development Services"
  echo ""
  echo "Commands:"
  echo "  restart - restart services"
  echo "  start   - start localstack and rabbitmq"
  echo "  stop    - stop localstack and rabbitmq"
  echo ""

  exit 1
}

services_command() {
  case "$1" in
    restart)
      "$0" services stop || true
      "$0" services start
      ;;
    start)
      nix run "$COMM_ROOT"#rabbitmq-up
      nix run "$COMM_ROOT"#localstack-up
      ;;
    stop)
      log "Stopping services"
      nix run "$COMM_ROOT"#localstack-down
      pkill rabbitmq-server beam.smp
      ;;
    *)
      log "$(basename "$0"): unknown services option '$1'"
      services_usage
      exit 1
    ;;
  esac
}

db_usage() {
  echo "Comm MariaDB Server"
  echo ""
  echo "Commands:"
  echo "  restart - restart MariaDB server"
  echo ""

  exit 1
}

db_command() {
  case "$1" in
    restart)
      pkill mariadbd
      nix run .#mariadb-up
      ;;
    *)
      log "$(basename "$0"): unknown db option '$1'"
      db_usage
      exit 1
    ;;
  esac
}

case "$1" in
  -h|--help)
    usage
    ;;
  services)
    shift
    services_command "$@"
    ;;
  db)
    shift
    db_command "$@"
    ;;
  *)
    log "$(basename "$0"): unknown option '$1'"
    usage
    ;;
esac
