#!/usr/bin/env bash

set -e

IDS=$(adb devices -l | tail -n +2 | cut -d ' ' -f 1)
ABIS=()

for ID in ${IDS}
do
  ABI=$(adb -s "$ID" shell getprop ro.product.cpu.abi)
  # check if we already have this ABI
  # shellcheck disable=SC2076
  if [[ " ${ABIS[*]} " =~ " ${ABI} " ]]; then
    continue
  fi
  # shellcheck disable=SC2179
	ABIS+="${ABI} "
done
# shellcheck disable=SC2128
echo "$ABIS"
