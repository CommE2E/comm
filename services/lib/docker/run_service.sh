#!/usr/bin/env bash

set -e

EXE_PATH="./cmake/build/bin"

EXE=$(find $EXE_PATH -mindepth 1 -maxdepth 1 -not -path '*/.*')
EXES=$(wc -l <<< "$EXE")

if [[ $EXES -ne 1 ]]; then
  echo "there should be exactly one executable of a service, $EXES found";
  exit 1;
fi

"$EXE"
