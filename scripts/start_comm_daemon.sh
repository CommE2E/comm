#!/usr/bin/env bash

service_command="$1"  # The command used to start the service (e.g. mariadbd)
service_name="$2"     # The official name of service (e.g. MariaDB)
entrypoint="$3"       # Command or script used to initiate service
pidfile="$4"          # Location of PID file

# Check if service was already started
set +e  # allow for pgrep to not find matches
# BSD pgrep doesn't have a "count" feature, use wc then trim whitespace
service_count=$(pgrep "$service_command" | wc -l | xargs echo)
set -euo pipefail

if [[ "$service_count" -eq "0" ]]; then
  echo "Starting $service_name"
  # No service present, start our own
  # Launch in subshell so if the original terminal is closed, the process
  # will be inherited instead of also being forced closed
  mkdir -p "$(dirname "${pidfile}")"
  ($entrypoint &
    echo "$!" > "$pidfile")

elif [[ "$service_count" -eq "1" ]]; then

  # Check if it was started by this script
  running_pid="$(pgrep "$service_command")"
  if [[ ! -f "$pidfile" ]] || \
      [[ "$(cat "$pidfile")" != "$running_pid" ]]; then
    echo "Existing $service_name instance found outside of nix environment" >&2
    echo "Please stop existing services and attempt 'nix develop' again" >&2
    exit 1
  fi

else
  echo "Many $service_name instances found outside of nix environment" >&2
  echo "Please stop existing services and attempt 'nix develop' again" >&2
  exit 1

fi
