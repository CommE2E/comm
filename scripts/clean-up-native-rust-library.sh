#!/bin/bash

NATIVE_RUST_DIR="${SRCROOT}/../native_rust_library"
rm -vrf "${NATIVE_RUST_DIR}"/{cxx.h,lib.rs.{h,cc}}
