# For more information about using CMake with Android Studio, read the
# documentation: https://d.android.com/studio/projects/add-native-code.html
project(comm CXX C)

set(CMAKE_CXX_STANDARD 14)

# C0103 is a naming convention, but the variable names which need to be set
# are determined by the upstream project
# cmake-lint: disable=C0103
# Disable line length as some paths are hard to reduce without becoming cryptic
# cmake-lint: disable=C0301

# Sets the minimum version of CMake required to build the native library.
cmake_minimum_required(VERSION 3.18)

# Creates and names a library, sets it as either STATIC
# or SHARED, and provides the relative paths to its source code.
# You can define multiple libraries, and CMake builds them for you.
# Gradle automatically packages shared libraries with your APK.
set(PACKAGE_NAME "comm_jni_module")

find_package(fbjni
  NAMES fbjni fbjniLibrary
  REQUIRED CONFIG
)

set(BUILD_TESTING OFF)
set(HAVE_SYMBOLIZE OFF)
set(WITH_GTEST OFF CACHE BOOL "Use googletest" FORCE)
set(WITH_GFLAGS OFF CACHE BOOL "Use gflags" FORCE)

# General
set(_third_party_dir ${CMAKE_CURRENT_SOURCE_DIR}/build/third-party-ndk)
set(_android_build_dir build/${CMAKE_ANDROID_ARCH_ABI})

# Protobuf
set(protobuf_BUILD_TESTS OFF)

# gRPC building parameters
set(gRPC_BUILD_CSHARP_EXT OFF)
set(gRPC_SSL_PROVIDER "package" CACHE STRING "SSL library provider")

# gRPC client
include(FetchContent)

# Ancient vendored checkout of folly still has a broken cmake config
add_library(
  folly
  ${_third_party_dir}/folly/folly/detail/Futex.cpp
  ${_third_party_dir}/folly/folly/synchronization/ParkingLot.cpp
  ${_third_party_dir}/folly/folly/lang/SafeAssert.cpp
  ${_third_party_dir}/folly/folly/FileUtil.cpp
  ${_third_party_dir}/folly/folly/Subprocess.cpp
  ${_third_party_dir}/folly/folly/File.cpp
  ${_third_party_dir}/folly/folly/Format.cpp
  ${_third_party_dir}/folly/folly/Conv.cpp
  ${_third_party_dir}/folly/folly/io/IOBuf.cpp
  ${_third_party_dir}/folly/folly/memory/detail/MallocImpl.cpp
  ${_third_party_dir}/folly/folly/ScopeGuard.cpp
  ${_third_party_dir}/folly/folly/hash/SpookyHashV2.cpp
  ${_third_party_dir}/folly/folly/io/IOBufQueue.cpp
  ${_third_party_dir}/folly/folly/lang/Assume.cpp
  ${_third_party_dir}/folly/folly/String.cpp
  ${_third_party_dir}/folly/folly/portability/SysUio.cpp
  ${_third_party_dir}/folly/folly/net/NetOps.cpp
  ${_third_party_dir}/folly/folly/dynamic.cpp
  ${_third_party_dir}/folly/folly/json.cpp
  ${_third_party_dir}/folly/folly/json_pointer.cpp
  ${_third_party_dir}/folly/folly/Unicode.cpp
)

target_include_directories(folly
  PUBLIC
  ${_third_party_dir}/folly/folly
)

export(TARGETS folly
  FILE ${CMAKE_CURRENT_BINARY_DIR}/folly/folly.cmake
)

if(CMAKE_ANDROID_ARCH_ABI STREQUAL arm64-v8a)
  set(Rust_CARGO_TARGET aarch64-linux-android)
elseif(CMAKE_ANDROID_ARCH_ABI STREQUAL x86)
  set(Rust_CARGO_TARGET i686-linux-android)
elseif(CMAKE_ANDROID_ARCH_ABI STREQUAL x86_64)
  set(Rust_CARGO_TARGET x86_64-linux-android)
elseif(CMAKE_ANDROID_ARCH_ABI STREQUAL armeabi-v7a)
  set(Rust_CARGO_TARGET arm-linux-androideabi)
endif()

string(TOLOWER ${CMAKE_HOST_SYSTEM_NAME} CMAKE_HOST_SYSTEM_NAME_LOWER)
set(AR $ENV{ANDROID_HOME}/ndk/${NDK_VERSION}/toolchains/llvm/prebuilt/${CMAKE_HOST_SYSTEM_NAME_LOWER}-x86_64/bin/${Rust_CARGO_TARGET}-ar)

FetchContent_Declare(
    Corrosion
    GIT_REPOSITORY https://github.com/corrosion-rs/corrosion.git
    GIT_TAG v0.2.2
)

FetchContent_MakeAvailable(Corrosion)

include(../../../shared/cmake/corrosion-cxx.cmake)

add_library_rust(PATH ../../native_rust_library NAMESPACE comm)

# Disable unused plugins
set(gRPC_BUILD_GRPC_PHP_PLUGIN OFF)
set(gRPC_BUILD_GRPC_RUBY_PLUGIN OFF)
set(gRPC_BUILD_GRPC_PYTHON_PLUGIN OFF)
set(gRPC_BUILD_GRPC_CSHARP_PLUGIN OFF)

# We're updating parameters below for Cmake's find_OpenSSL() function
set(OPENSSL_ROOT_DIR
  "${_third_party_dir}/openssl/openssl-${OPENSSL_VERSION}/${_android_build_dir}"
)
list(APPEND CMAKE_FIND_ROOT_PATH "${OPENSSL_ROOT_DIR}")

add_subdirectory(${_third_party_dir}/grpc/grpc-${GRPC_VERSION}/
  ${CMAKE_CURRENT_BINARY_DIR}/grpc/
  EXCLUDE_FROM_ALL
)
add_subdirectory(${_third_party_dir}/glog/glog-${GLOG_VERSION}/)
add_subdirectory(../../node_modules/olm ./build)

add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../cpp/CommonCpp
  ${CMAKE_CURRENT_BINARY_DIR}/CommonCpp
  EXCLUDE_FROM_ALL
)

set(_node_modules_dir ${CMAKE_CURRENT_SOURCE_DIR}/../../node_modules)
set(_react_native_dir ${_node_modules_dir}/react-native)

string(TOLOWER ${CMAKE_BUILD_TYPE} CMAKE_BUILD_TYPE_LOWER)

include_directories(
  ${_react_native_dir}/React
  ${_react_native_dir}/React/Base
  ${_react_native_dir}/ReactCommon
  ${_react_native_dir}/ReactCommon/jsi
  ${_react_native_dir}/ReactCommon/callinvoker
  ${_react_native_dir}/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/ReactCommon

  # OpenSSL
  ${_third_party_dir}/openssl/openssl-${OPENSSL_VERSION}/build/${CMAKE_ANDROID_ARCH_ABI}/include

  # SQLCipher amalgamation
  ${_node_modules_dir}/@commapp/sqlcipher-amalgamation/src

  # SQLite ORM
  ../../cpp/third-party/sqlite_orm

  # symlinked React Native headers
  ../headers

  # external libs
  ${_third_party_dir}/boost/boost
  ${_third_party_dir}/double-conversion

  # comm android specific code
  ./src/cpp

  # comm native mutual code
  ../../cpp/CommonCpp/
  ../../cpp/CommonCpp/NativeModules
  ../../cpp/CommonCpp/NativeModules/InternalModules
  ../../cpp/CommonCpp/NativeModules/PersistentStorageUtilities
  ../../cpp/CommonCpp/NativeModules/PersistentStorageUtilities/ThreadOperationsUtilities
  ../../cpp/CommonCpp/NativeModules/PersistentStorageUtilities/MessageOperationsUtilities
  ../../cpp/CommonCpp/NativeModules/PersistentStorageUtilities/MessageOperationsUtilities/MessageSpecs
  ../../cpp/CommonCpp/DatabaseManagers
  ../../cpp/CommonCpp/Tools
  ../../../shared/protos/_generated
  ../../cpp/CommonCpp/grpc

  # native rust library
  ./.cxx/cmake/${CMAKE_BUILD_TYPE_LOWER}/${CMAKE_ANDROID_ARCH_ABI}/cargo/build/${Rust_CARGO_TARGET}/cxxbridge/native_rust_library/src
)

# search for all cpp files in this directory
file(GLOB SQLCIPHER
  "${_node_modules_dir}/@commapp/sqlcipher-amalgamation/src/*.c"
)
file(GLOB ANDROID_NATIVE_CODE "./src/cpp/*.cpp")
file(GLOB DOUBLE_CONVERSION_SOURCES
  "${_third_party_dir}/double-conversion/double-conversion/*.cc"
)
file(GLOB GRPC_CODE "../../../shared/protos/_generated/*.cc")

add_library(
  # Sets the name of the library.
  ${PACKAGE_NAME}

  # Sets the library as a shared library.
  SHARED

  # Provides a relative path to your source file(s).
  ${_react_native_dir}/ReactCommon/jsi/jsi/jsi.cpp
  ${_react_native_dir}/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/ReactCommon/CallInvokerHolder.cpp
  ${_react_native_dir}/ReactCommon/react/nativemodule/core/ReactCommon/TurboModule.cpp
  ${_react_native_dir}/ReactCommon/react/nativemodule/core/ReactCommon/LongLivedObject.cpp
  ${_react_native_dir}/ReactCommon/react/nativemodule/core/ReactCommon/TurboModuleUtils.cpp

  # SQLCipher
  ${SQLCIPHER}

  # double-conversion
  ${DOUBLE_CONVERSION_SOURCES}

  ${GRPC_CODE}

  # comm code
  ${ANDROID_NATIVE_CODE}
)

add_definitions(
  # Folly
  -DFOLLY_NO_CONFIG=1
  -DFOLLY_HAVE_CLOCK_GETTIME=1
  -DFOLLY_HAVE_MEMRCHR=1
  -DFOLLY_USE_LIBCPP=1
  -DFOLLY_MOBILE=1

  # SQLCipher
  -DSQLITE_THREADSAFE=0
  -DSQLITE_HAS_CODEC
  -DSQLITE_TEMP_STORE=2
  -DSQLCIPHER_CRYPTO_OPENSSL
)

find_library(log-lib log)

add_library(
  # OpenSSL Crypto lib
  openssl-crypto
  STATIC
  IMPORTED
)

set_target_properties(
  # OpenSSL Crypto lib
  openssl-crypto
  PROPERTIES IMPORTED_LOCATION
  "${_third_party_dir}/openssl/openssl-${OPENSSL_VERSION}/build/${CMAKE_ANDROID_ARCH_ABI}/lib/libcrypto.a"
)

add_library(
  # OpenSSL SSL lib
  openssl-ssl
  STATIC
  IMPORTED
)

set_target_properties(
  # OpenSSL SSL lib
  openssl-ssl
  PROPERTIES IMPORTED_LOCATION
  "${_third_party_dir}/openssl/openssl-${OPENSSL_VERSION}/build/${CMAKE_ANDROID_ARCH_ABI}/lib/libssl.a"
)

target_link_libraries(
  ${PACKAGE_NAME}
  fbjni::fbjni
  android
  ${log-lib}
  folly
  glog::glog
  olm
  openssl-crypto
  openssl-ssl
  grpc++
  libprotobuf
  comm::native_rust_library
)

# add a dummy library which is required by CallInvokerHolderImpl.java
add_library(
  turbomodulejsijni
  # Sets the library as a shared library.
  SHARED
  # Provides a relative path to your source file(s).
  ./src/cpp/dummy.cpp
)
