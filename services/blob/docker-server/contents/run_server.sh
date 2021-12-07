#!/bin/bash

set -e

if [ "$COMM_TEST_SERVICES" -eq 1 ]; then
  /transferred/run_tests.sh
  exit 0;
fi

/transferred/server/cmake/build/bin/blob
