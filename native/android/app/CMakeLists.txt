# For more information about using CMake with Android Studio, read the
# documentation: https://d.android.com/studio/projects/add-native-code.html
project(comm CXX C)

set(CMAKE_CXX_STANDARD 17)

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

find_package(fbjni REQUIRED CONFIG)

set(BUILD_TESTING OFF)
set(HAVE_SYMBOLIZE OFF)
set(WITH_GTEST OFF CACHE BOOL "Use googletest" FORCE)
set(WITH_GFLAGS OFF CACHE BOOL "Use gflags" FORCE)

# General
set(_third_party_dir ${CMAKE_CURRENT_SOURCE_DIR}/build/third-party-ndk)
set(_android_build_dir build/${CMAKE_ANDROID_ARCH_ABI})

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
  GIT_TAG v0.2.1
)

FetchContent_MakeAvailable(Corrosion)

include(../../../shared/cmake/corrosion-cxx.cmake)

add_library_rust(PATH ../../native_rust_library NAMESPACE comm)

# We're updating parameters below for Cmake's find_OpenSSL() function
set(OPENSSL_ROOT_DIR
  "${_third_party_dir}/openssl/openssl-${OPENSSL_VERSION}/${_android_build_dir}"
)
list(APPEND CMAKE_FIND_ROOT_PATH "${OPENSSL_ROOT_DIR}")

# Override HAVE_EXECINFO_H in glog's CMakeLists.txt
if(
  CMAKE_ANDROID_ARCH_ABI STREQUAL arm64-v8a OR
  CMAKE_ANDROID_ARCH_ABI STREQUAL armeabi-v7a
)
  set(HAVE_EXECINFO_H OFF CACHE BOOL "Whether platform has execinfo.h")
endif()

add_subdirectory(${_third_party_dir}/glog/glog-${GLOG_VERSION}/)

file(GLOB LIBRN_DIR "${REACT_NATIVE_SO_DIR}/${ANDROID_ABI}")
if (NOT LIBRN_DIR)
  # If /${ANDROID_ABI} dir not found, then ${REACT_NATIVE_SO_DIR} is probably:
  # ReactAndroid/build/react-ndk/exported
  file(GLOB LIBRN_DIR "${REACT_NATIVE_SO_DIR}")
endif ()

include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/folly-target.cmake)
include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/openssl-target.cmake)

add_subdirectory(../../node_modules/olm ./build)

set(_node_modules_dir ${CMAKE_CURRENT_SOURCE_DIR}/../../node_modules)
set(_react_native_dir ${_node_modules_dir}/react-native)

add_subdirectory(../../cpp/CommonCpp/
  ${CMAKE_CURRENT_BINARY_DIR}/build/CommonCpp
  EXCLUDE_FROM_ALL
)

file(GLOB SQLCIPHER
  "${_node_modules_dir}/@commapp/sqlcipher-amalgamation/src/*.c"
)
file(GLOB ANDROID_NATIVE_CODE "./src/cpp/*.cpp")

set(GENERATED_NATIVE_CODE "../../cpp/CommonCpp/_generated/commJSI-generated.cpp")
file(GLOB CRYPTO_NATIVE_CODE "../../cpp/CommonCpp/CryptoTools/*.cpp")
file(GLOB DB_NATIVE_CODE "../../cpp/CommonCpp/DatabaseManagers/*.cpp")
file(GLOB DB_ENTITIES_NATIVE_CODE "../../cpp/CommonCpp/DatabaseManagers/entities/*.cpp")
file(GLOB_RECURSE MODULE_NATIVE_CODE "../../cpp/CommonCpp/NativeModules/**/*.cpp")
file(GLOB MODULE_ROOT_NATIVE_CODE "../../cpp/CommonCpp/NativeModules/*.cpp")
file(GLOB TOOLS_NATIVE_CODE "../../cpp/CommonCpp/Tools/*.cpp")
file(GLOB NOTIFICATIONS_NATIVE_CODE "../../cpp/CommonCpp/Notifications/**/*.cpp")

add_library(
  # Sets the name of the library
  ${PACKAGE_NAME}

  # Sets the library as a shared library
  SHARED

  # React dependencies
  ${_react_native_dir}/ReactCommon/jsi/jsi/jsi.cpp
  ${_react_native_dir}/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/ReactCommon/CallInvokerHolder.cpp
  ${_react_native_dir}/ReactCommon/react/nativemodule/core/ReactCommon/TurboModule.cpp
  ${_react_native_dir}/ReactCommon/react/bridging/LongLivedObject.cpp
  ${_react_native_dir}/ReactCommon/react/nativemodule/core/ReactCommon/TurboModuleUtils.cpp

  # Third party dependencies
  ${SQLCIPHER}

  # comm code
  ${ANDROID_NATIVE_CODE}
  ${GENERATED_NATIVE_CODE}
  ${CRYPTO_NATIVE_CODE}
  ${DB_NATIVE_CODE}
  ${DB_ENTITIES_NATIVE_CODE}
  ${MODULE_NATIVE_CODE}
  ${MODULE_ROOT_NATIVE_CODE}
  ${TOOLS_NATIVE_CODE}
  ${NOTIFICATIONS_NATIVE_CODE}
)

set(BUILD_DIR ${CMAKE_SOURCE_DIR}/build)

target_include_directories(
  ${PACKAGE_NAME}
  PRIVATE

  # React Native
  ${_react_native_dir}/React
  ${_react_native_dir}/React/Base
  ${_react_native_dir}/ReactCommon
  ${_react_native_dir}/ReactCommon/jsi
  ${_react_native_dir}/ReactCommon/callinvoker
  ${_react_native_dir}/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/ReactCommon

  # SQLCipher amalgamation
  ${_node_modules_dir}/@commapp/sqlcipher-amalgamation/src

  # SQLite ORM
  ../../cpp/third-party/sqlite_orm

  # symlinked React Native headers
  ../headers

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
  ../../cpp/CommonCpp/Notifications
  ../../cpp/CommonCpp/Notifications/BackgroundDataStorage

  # native rust library
  ${native_rust_library_include_dir}
)

add_definitions(
  # SQLCipher
  -DSQLITE_THREADSAFE=0
  -DSQLITE_HAS_CODEC
  -DSQLITE_TEMP_STORE=2
  -DSQLCIPHER_CRYPTO_OPENSSL
)

find_library(log-lib log)

target_link_libraries(
  ${PACKAGE_NAME}
  fbjni::fbjni
  android
  ${log-lib}
  Folly::folly
  glog::glog
  olm
  openssl-crypto
  openssl-ssl
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
