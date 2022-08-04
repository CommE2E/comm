#!/usr/bin/env bash

set -e

IDS=$(adb devices -l | tail -n +2 | cut -d ' ' -f 1)
ABIS=()

for ID in ${IDS}
do
  ABI=$(adb -s "$ID" shell getprop ro.product.cpu.abi)
  
  found=false
  for ABI_ in "${ABIS[@]}"
  do
    # check if we already have this ABI
    if [[ "${ABI} " == "${ABI_}" ]]; then
      found=true
      break
    fi
  done
  if [[ ! $found ]]; then
    ABIS+=("${ABI} ")
  fi
done

echo "${ABIS[@]}"
