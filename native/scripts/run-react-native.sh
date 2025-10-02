#!/usr/bin/env bash

# This script is necessary for running react-native CLI commands from the Nix environment
# We need it because the Nix environment overrides a bunch of compiler env vars
# Our Rust build has dependencies that assume the standard macOS compiler environment

set -euo pipefail

export CPATH=
export CPLUS_INCLUDE_PATH=
export OBJC_INCLUDE_PATH=

CC=$(/usr/bin/xcrun --sdk macosx --find clang)
CXX=$(/usr/bin/xcrun --sdk macosx --find clang++)
export CC
export CXX

SDKROOT=$(/usr/bin/xcrun --sdk macosx --show-sdk-path)
export SDKROOT
export CFLAGS="-isysroot $SDKROOT"
export RUSTFLAGS="-C link-arg=-isysroot -C link-arg=$SDKROOT -C link-arg=-Wl,-search_paths_first"

DEVELOPER_DIR=$(/usr/bin/xcode-select -p)
DEVELOPER_BIN="$DEVELOPER_DIR/usr/bin"
TOOLCHAIN_DIR="$DEVELOPER_DIR/Toolchains/XcodeDefault.xctoolchain"
TOOLCHAIN_BIN="$TOOLCHAIN_DIR/usr/bin"
TOOLCHAIN_INCLUDE="$TOOLCHAIN_DIR/usr/include/c++/v1"

export PATH="$TOOLCHAIN_BIN:$DEVELOPER_BIN:/usr/bin:/bin:$PATH"
export CXXFLAGS="-isysroot $SDKROOT -stdlib=libc++ -isystem $TOOLCHAIN_INCLUDE"

exec react-native "$@"
