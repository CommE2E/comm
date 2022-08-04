#!/usr/bin/env bash

set -e

# Allow scripts to be called from anywhere
SCRIPT_DIR=$(cd "$(dirname "$0")"; pwd -P)

# folly hack - https://github.com/facebook/folly/pull/1231
sed -i 's/#if __has_include(<demangle.h>)/#if __has_include(<Demangle.h>)/g' \
  /usr/local/include/folly/detail/Demangle.h

rm -rf cmake/build
mkdir -p cmake/build

"${SCRIPT_DIR}"/build_sources.sh
