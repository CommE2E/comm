#!/bin/bash

set -e

EXE_PATH="./cmake/build/bin"

EXE=`ls $EXE_PATH`
EXES=`ls $EXE_PATH | wc -l`

if [[ $EXES -ne 1 ]]; then
  echo "there should be exactly one executable of a service, $EXES found";
  exit 1;
fi

$EXE_PATH/$EXE
