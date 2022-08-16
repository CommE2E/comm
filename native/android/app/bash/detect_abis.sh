#!/usr/bin/env bash

set -e

IDS=$(adb devices -l | tail -n +2 | cut -d ' ' -f 1)
ABIS=()

for ID in ${IDS}
do
  ABI=$(adb -s "$ID" shell getprop ro.product.cpu.abi)
  # Check if this ABI is already in ABIS
  found=false
  for e in "${ABIS[@]}"; do
    if [[ "${e}" == "${ABI}" ]]; then
      found=true
      break
    fi
  done
  if [[ "$found" = "false" ]]; then
    ABIS+=("${ABI}")
  fi
done
echo "${ABIS[@]}"
