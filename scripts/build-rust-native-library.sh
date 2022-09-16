#!/bin/bash

set -x
# The $PATH used by Xcode likely won't contain Cargo, fix that.
# In addition, the $PATH used by XCode has lots of Apple-specific
# developer tools that your Cargo isn't expecting to use, fix that.
# Note: This assumes a default `rustup` setup and default path.
build_path="$HOME/.cargo/bin:/usr/local/bin:/usr/bin:/bin"
# cd to Cargo project
cd "${SRCROOT}/../cpp/CommonCpp/grpc/grpc_client" || exit
# Add iOS targets for cross-compilation
env PATH="${build_path}" rustup target add aarch64-apple-ios
env PATH="${build_path}" rustup target add x86_64-apple-ios
# Install cargo lipo
env PATH="${build_path}" cargo install cargo-lipo
# Set C++ standard and build cxx bridge
export CXXFLAGS="-std=c++14"
env PATH="${build_path}" cargo build
# Build universal static library (works on simulator and iOS)
env PATH="${build_path}" cargo lipo --release
# Unset the flag specifying C++ standard
unset CXXFLAGS
# Copy the CXX files to the cargo project root to make them
# available to XCode
cp "$(readlink target/cxxbridge/grpc_client/src/lib.rs.cc)" .
cp "$(readlink target/cxxbridge/grpc_client/src/lib.rs.h)" .
cp "$(readlink target/cxxbridge/rust/cxx.h)" .
