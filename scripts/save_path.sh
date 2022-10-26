#!/usr/bin/env bash

# Save the `PATH` to a known location, this is to aide with xcode which will
# unset all environment variables before attempting builds

COMM_CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/comm"

mkdir -p "$COMM_CACHE"

echo "export PATH=\"$PATH\${PATH:+:}\$PATH\"" > "$COMM_CACHE"/path
