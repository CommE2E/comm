# For more information about using CMake with Android Studio, read the
# documentation: https://d.android.com/studio/projects/add-native-code.html
project(comm)

set (CMAKE_CXX_STANDARD 14)

# Sets the minimum version of CMake required to build the native library.

cmake_minimum_required(VERSION 3.4.1)

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
add_subdirectory(./build/third-party-ndk/grpc/ ${CMAKE_CURRENT_BINARY_DIR}/grpc EXCLUDE_FROM_ALL)
add_subdirectory(./build/third-party-ndk/glog/glog-0.4.0/)
add_subdirectory(../../node_modules/olm ./build)

include_directories(
  ../../node_modules/react-native/React
  ../../node_modules/react-native/React/Base
  ../../node_modules/react-native/ReactCommon
  ../../node_modules/react-native/ReactCommon/jsi
  ../../node_modules/react-native/ReactCommon/callinvoker
  ../../node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/ReactCommon
  # sqlite code
  ../../node_modules/@nozbe/sqlite/sqlite-amalgamation-3310100
  ../../cpp/lib/sqlite_orm
  # symlinked React Native headers
  ../headers
  # external libs
  ./build/third-party-ndk/folly
  ./build/third-party-ndk/boost/boost
  ./build/third-party-ndk/double-conversion
  # comm android specific code
  ./src/cpp
  # comm native mutual code
  ../../cpp/CommonCpp/NativeModules
  ../../cpp/CommonCpp/DatabaseManagers
  ../../cpp/CommonCpp/Tools
  ../../cpp/CommonCpp/grpc/_generated
  ../../cpp/CommonCpp/grpc
)

# search for all cpp files in this directory
file(GLOB SQLITE "../../node_modules/@nozbe/sqlite/sqlite-amalgamation-3310100/*.c")
file(GLOB COMMON_NATIVE_CODE "../../cpp/CommonCpp/**/*.cpp")
file(GLOB ANDROID_NATIVE_CODE "./src/cpp/*.cpp")
file(GLOB DOUBLE_CONVERSION_SOURCES "./build/third-party-ndk/double-conversion/double-conversion/*.cc")
file(GLOB GRPC_CODE "../../cpp/CommonCpp/grpc/_generated/*.cc")

add_library(
  # Sets the name of the library.
  ${PACKAGE_NAME}
  # Sets the library as a shared library.
  SHARED
  # Provides a relative path to your source file(s).
  ../../node_modules/react-native/ReactCommon/jsi/jsi/jsi.cpp
  ../../node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/ReactCommon/CallInvokerHolder.cpp
  ../../node_modules/react-native/ReactCommon/react/nativemodule/core/ReactCommon/TurboModule.cpp
  ../../node_modules/react-native/ReactCommon/react/nativemodule/core/ReactCommon/LongLivedObject.cpp
  ../../node_modules/react-native/ReactCommon/react/nativemodule/core/ReactCommon/TurboModuleUtils.cpp
  ${SQLITE}

  # folly
  ./build/third-party-ndk/folly/folly/detail/Futex.cpp
  ./build/third-party-ndk/folly/folly/synchronization/ParkingLot.cpp
  ./build/third-party-ndk/folly/folly/lang/SafeAssert.cpp
  ./build/third-party-ndk/folly/folly/FileUtil.cpp
  ./build/third-party-ndk/folly/folly/Subprocess.cpp
  ./build/third-party-ndk/folly/folly/File.cpp
  ./build/third-party-ndk/folly/folly/Format.cpp
  ./build/third-party-ndk/folly/folly/Conv.cpp
  ./build/third-party-ndk/folly/folly/io/IOBuf.cpp
  ./build/third-party-ndk/folly/folly/memory/detail/MallocImpl.cpp
  ./build/third-party-ndk/folly/folly/ScopeGuard.cpp
  ./build/third-party-ndk/folly/folly/hash/SpookyHashV2.cpp
  ./build/third-party-ndk/folly/folly/io/IOBufQueue.cpp
  ./build/third-party-ndk/folly/folly/lang/Assume.cpp
  ./build/third-party-ndk/folly/folly/String.cpp
  ./build/third-party-ndk/folly/folly/portability/SysUio.cpp
  ./build/third-party-ndk/folly/folly/net/NetOps.cpp

  # double-conversion
  ${DOUBLE_CONVERSION_SOURCES}

  ${GRPC_CODE}

  # comm code
  ${ANDROID_NATIVE_CODE}
  ${COMMON_NATIVE_CODE}
)

add_definitions(
  -DFOLLY_NO_CONFIG=1
  -DFOLLY_HAVE_CLOCK_GETTIME=1
  -DFOLLY_HAVE_MEMRCHR=1
  -DFOLLY_USE_LIBCPP=1
  -DFOLLY_MOBILE=1
  -DSQLITE_THREADSAFE=0
)

find_library(log-lib log)

target_link_libraries(
  ${PACKAGE_NAME}
  fbjni::fbjni
  android
  ${log-lib}
  glog::glog
  olm
  grpc++
  libprotobuf
)

# add a dummy library which is required by CallInvokerHolderImpl.java
add_library(
  turbomodulejsijni
  # Sets the library as a shared library.
  SHARED
  # Provides a relative path to your source file(s).
  ./src/cpp/dummy.cpp
)
