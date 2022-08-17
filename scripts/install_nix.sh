#!/usr/bin/env bash

# Do initial nix install if nix is not available in PATH
if ! command -v nix > /dev/null; then
  sh <(curl -L https://nixos.org/nix/install) --daemon

  # Source nix-daemon.sh to add nix to PATH
  if [[ -e '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh' ]]; then
    # Path doesn't exist in shellcheck CI container
    # shellcheck source=/dev/null
    . '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh'
  fi
fi

# Figure out how many cores the system has, and set cache default
if [[ "$OSTYPE" == 'darwin'* ]]; then
  NPROC=$(sysctl -n hw.physicalcpu)
  ADMIN_GROUP="@admin"
elif [[ "$OSTYPE" == 'linux'* ]]; then
  NPROC=$(nproc)
  ADMIN_GROUP="@wheel @sudo"
fi

# Jobs = The number of different nix packages able to be built at the same time
# Cores = How many cores an individual job may use. This value is
#   assigned to $NIX_BUILD_CORES within a nix build environment.
jobs=$((NPROC / 2)) # Use only half of cores for individual jobs
cores=4 # Just a good default for consumer hardware
# NOTE: This has the potential of over-subscribing cores by a factor of 2.
# Potential load = jobs * cores = (n/2) * 4 = 2n
# However, this is probably the best compromise as most builds are largely
# single threaded, with a few exceptions which are massively parrallel.

# Check if nix.conf contains a value, append a default if missing.
add_if_missing_in_nix_conf() {
  local key="$1"
  local value="$2"

  if ! grep "$key" /etc/nix/nix.conf &> /dev/null && \
    sudo test -w /etc/nix/nix.conf; then
    echo "${key} = ${value}" | sudo tee -a /etc/nix/nix.conf &> /dev/null
  fi
}

# Check if nix.conf is already configured for a given value.
add_if_missing_in_nix_conf "trusted-users" "${ADMIN_GROUP} ${USER}"
add_if_missing_in_nix_conf \
  "experimental-features" "flakes nix-command"
add_if_missing_in_nix_conf "cores" "${cores}"
add_if_missing_in_nix_conf "max-jobs" "${jobs}"

# Ask user if they would like to use Powerline for bash prompt
SCRIPT_DIR=$(cd "$(dirname "$0")" || true; pwd -P)
# Build the nixified script which is aware of Powerline and dependencies
nix build "$SCRIPT_DIR"'/..#better-prompt'
# Source file to apply Powerline bootstrap logic
# shellcheck source=/dev/null
. "$(nix eval --raw "$SCRIPT_DIR"'/..#better-prompt.outPath')/bin/better-prompt"
