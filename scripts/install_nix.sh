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

  if ! grep "$key" /etc/nix/nix.conf &> /dev/null; then
    echo "/etc/nix/nix.conf is missing a value for ${key}. " \
      "Appending '${key} = ${value}' to /etc/nix/nix.conf"

    # Make sure that user can write to file
    if sudo test -w /etc/nix/nix.conf; then
      echo "${key} = ${value}" | sudo tee -a /etc/nix/nix.conf &> /dev/null
    else
      # nix.conf is read only, which is true for NixOS
      echo "Unable to write '${key} = ${value}' to nix.conf, " \
        "please add the value to your nix.conf"
    fi
  fi
}

# Add value for a given value, append the additional value
append_value_in_nix_conf() {
  local key="$1"
  local value="$2"

  # Add value for key if it's missing entirely
  if ! grep "$key" /etc/nix/nix.conf &> /dev/null; then
    add_if_missing_in_nix_conf "$key" "$value";
    return $?
  fi

  # Check that key does not already contain the desired value
  if ! grep "$key" /etc/nix/nix.conf | grep "$value" &> /dev/null; then
    echo "/etc/nix/nix.conf is missing '${value}' for '${key}'. " \
      "Appending '${value}' to '${key}' in /etc/nix/nix.conf"

    # Make sure that user can write to file
    if sudo test -w /etc/nix/nix.conf; then
      # Find the line with the related setting, then append the new value
      # Values for nix.conf are space separated
      sudo sed -i.bak  -e "|$key|s|\$| $value|" /etc/nix/nix.conf
    else
      # nix.conf is read only, which is true for NixOS
      echo "Unable to write to nix.conf, please append '$value' to '$key'" \
        "in your nix.conf"
    fi
  fi
}

# Check if nix.conf is already configured for a given value.
add_if_missing_in_nix_conf "trusted-users" "${ADMIN_GROUP} ${USER}"
add_if_missing_in_nix_conf \
  "experimental-features" "flakes nix-command"
add_if_missing_in_nix_conf "cores" "${cores}"
add_if_missing_in_nix_conf "max-jobs" "${jobs}"

# Explictly add default cache for older nix versions to prevent custom cache
# becoming only trusted cache.
append_value_in_nix_conf "substituters" "https://cache.nixos.org"
append_value_in_nix_conf "trusted-public-keys" \
  "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="

append_value_in_nix_conf "substituters" "https://comm.cachix.org"
append_value_in_nix_conf "trusted-public-keys" \
  "comm.cachix.org-1:70RF31rkmCEhQ9HrXA2uXcpqQKGcUK3TxLJdgcUCaA4="

# Ask user if they would like to use Powerline for bash prompt
SCRIPT_DIR=$(cd "$(dirname "$0")" || true; pwd -P)
# Build the nixified script which is aware of Powerline and dependencies
nix build "$SCRIPT_DIR"'/..#better-prompt'
# Source file to apply Powerline bootstrap logic
# shellcheck source=/dev/null
. "$(nix eval --raw "$SCRIPT_DIR"'/..#better-prompt.outPath')/bin/better-prompt"
