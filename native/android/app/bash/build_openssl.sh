#!/usr/bin/env bash
# OpenSSL library building automation script for
# the Gradle build process integration.
#
# Libraries will be installed into:
# $OPENSSL_SUBMODULE_PATH/build/$ANDROID_ARCH_ABI
set -e

# Arguments:
readonly OPENSSL_SUBMODULE_PATH=$1
readonly HOST_TAG=$2         # darwin-x86_64 / linux-x86_64
readonly ANDROID_ARCH_ABI=$3 # arm64-v8a / armeabi-v7a / x86 / x86_64
readonly MIN_SDK_VERSION=$4
readonly THREADS=$6
export ANDROID_NDK_HOME=$5

case "$ANDROID_ARCH_ABI" in
"arm64-v8a")
  TARGET_ARCH="aarch64-linux-android"
  BUILD_ARCH="android-arm64"
  ;;
"armeabi-v7a")
  TARGET_ARCH="armv7a-linux-androideabi"
  BUILD_ARCH="android-arm"
  ;;
"x86_64")
  TARGET_ARCH="x86_64-linux-android"
  BUILD_ARCH="android-x86_64"
  ;;
*)
  echo "Unsupported architecture: $ANDROID_ARCH_ABI"
  exit 1
  ;;
esac

CONFIGURE_AND_BUILD() {
  # Local arguments:
  readonly TARGET_ARCH=$1
  readonly BUILD_ARCH=$2
  readonly BUILD_PREFIX=$3

  echo "Building OpenSSL library for ${BUILD_PREFIX} (${TARGET_ARCH})"
  cd "$OPENSSL_SUBMODULE_PATH"

  # Compilation flags:
  export CFLAGS="-Os -ffunction-sections -fdata-sections -fno-unwind-tables -fno-asynchronous-unwind-tables"
  export LDFLAGS="-Wl,-s -Wl,-Bsymbolic -Wl,--gc-sections"
  export TOOLCHAIN=$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/$HOST_TAG
  export TARGET_HOST=${TARGET_ARCH}
  PATH=$TOOLCHAIN/bin:$PATH

  ./config no-asm -Wl,--enable-new-dtags,-rpath,"$(LIBRPATH)"
  ./Configure "${BUILD_ARCH}" no-shared \
    -D__ANDROID_API__="$MIN_SDK_VERSION" \
    --prefix="$OPENSSL_SUBMODULE_PATH"/build/"${BUILD_PREFIX}"
  make -j"$THREADS"
  make install_sw
  make clean
}

CONFIGURE_AND_BUILD "$TARGET_ARCH" "$BUILD_ARCH" "$ANDROID_ARCH_ABI"
