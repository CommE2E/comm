#!/usr/bin/env bash

set -e

# Allow scripts to be called from anywhere
SCRIPT_DIR=$(cd "$(dirname "$0")"; pwd -P)

# folly hack - https://github.com/facebook/folly/pull/1231
if [[ -f /usr/lib/folly/folly/detail/Demangle.h ]]; then
  # Legacy path-centric workflow
  sed -i 's/#if __has_include(<demangle.h>)/#if __has_include(<Demangle.h>)/g' \
    /usr/lib/folly/folly/detail/Demangle.h
  rm -rf lib
  mkdir lib
  pushd lib
  ln -s /usr/lib/folly .
  ln -s /usr/lib/glog .
  ln -s /usr/lib/double-conversion .
  popd # lib

  rm -rf _generated
  mkdir _generated

  "${SCRIPT_DIR}"/proto_codegen.sh
else
  # New installation centric workflow
  sed -i 's/#if __has_include(<demangle.h>)/#if __has_include(<Demangle.h>)/g' \
    /usr/local/include/folly/detail/Demangle.h
fi

rm -rf cmake/build
mkdir -p cmake/build

"${SCRIPT_DIR}"/build_sources.sh
