#!/usr/bin/env bash

set -euxo pipefail

COMM_NIX_PATH="$HOME/.cache/comm/path"
PRJ_ROOT="$(git rev-parse --show-toplevel)"

# If in nix environment, re-expose nix PATH
if [[ -f "$COMM_NIX_PATH" ]]; then
  # shellcheck source=/dev/null
  source "$COMM_NIX_PATH"
fi

# The $PATH used by Xcode likely won't contain Cargo, fix that.
# In addition, the $PATH used by XCode has lots of Apple-specific
# developer tools that your Cargo isn't expecting to use, fix that.
# Note: This assumes a default `rustup` setup and default path.
build_path="$HOME/.cargo/bin:/usr/local/bin:/usr/bin:/bin${PATH:+:}$PATH"

# cd to Cargo project
cd "${SRCROOT}/../native_rust_library" || exit

# Ensure rust tooling is available
env PATH="${build_path}" "$PRJ_ROOT/scripts/ensure_rustup_setup.sh"

# Set C++ standard and build cxx bridge
export CXXFLAGS="-std=c++14"
env PATH="${build_path}" cargo build --release
# Build universal static library (works on simulator and iOS)
env PATH="${build_path}" cargo lipo --release
# Unset the flag specifying C++ standard
unset CXXFLAGS
# Copy the CXX files to the cargo project root to make them
# available to XCode
cp "$(readlink target/cxxbridge/native_rust_library/src/lib.rs.cc)" .
cp "$(readlink target/cxxbridge/native_rust_library/src/lib.rs.h)" .
cp "$(readlink target/cxxbridge/rust/cxx.h)" .
