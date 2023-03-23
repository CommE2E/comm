# Allow project to set version
cmake_policy(SET CMP0048 NEW)
project(native_rust_library
  LANGUAGES CXX
  VERSION 0.1.0
)

# Minimum supported version for corrosion
cmake_minimum_required(VERSION 3.15)

include(FetchContent)

if(CMAKE_ANDROID_ARCH_ABI STREQUAL arm64-v8a)
  set(Rust_CARGO_TARGET aarch64-linux-android)
elseif(CMAKE_ANDROID_ARCH_ABI STREQUAL x86)
  set(Rust_CARGO_TARGET i686-linux-android)
elseif(CMAKE_ANDROID_ARCH_ABI STREQUAL x86_64)
  set(Rust_CARGO_TARGET x86_64-linux-android)
elseif(CMAKE_ANDROID_ARCH_ABI STREQUAL armeabi-v7a)
  set(Rust_CARGO_TARGET armv7-linux-androideabi)
endif()

string(TOLOWER ${CMAKE_HOST_SYSTEM_NAME} CMAKE_HOST_SYSTEM_NAME_LOWER)
set(_toolchain_path
  "$ENV{ANDROID_HOME}/ndk/${NDK_VERSION}/toolchains/llvm/prebuilt/${CMAKE_HOST_SYSTEM_NAME_LOWER}-x86_64/bin"
)
if(EXISTS "${_toolchain_path}/${Rust_CARGO_TARGET}-ar")
  set(AR "${_toolchain_path}/${Rust_CARGO_TARGET}-ar")
else()
  set(AR "${_toolchain_path}/llvm-ar")
endif()

FetchContent_Declare(
  Corrosion
  GIT_REPOSITORY https://github.com/corrosion-rs/corrosion.git
  GIT_TAG v0.3.5
)

FetchContent_MakeAvailable(Corrosion)

corrosion_import_crate(MANIFEST_PATH ${CMAKE_CURRENT_LIST_DIR}/Cargo.toml)
