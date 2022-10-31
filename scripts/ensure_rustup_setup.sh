#!/usr/bin/env bash

ensure_target() {
  local target="$1"

  if ! rustup target list --installed | grep "$target" > /dev/null; then
    rustup target add "$1"
  fi
}

if ! command -v rustup > /dev/null; then
  echo "Please install rustup" >&2
  exit 1
fi

if [[ "$(rustup toolchain list)" == "no installed toolchains" ]]; then
  rustup toolchain install stable
fi

ensure_target aarch64-apple-ios
ensure_target x86_64-apple-ios

if ! command -v cargo-lipo > /dev/null; then
  cargo install cargo-lipo
fi
