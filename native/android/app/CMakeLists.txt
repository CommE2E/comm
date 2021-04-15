# For more information about using CMake with Android Studio, read the
# documentation: https://d.android.com/studio/projects/add-native-code.html

# Sets the minimum version of CMake required to build the native library.

cmake_minimum_required(VERSION 3.4.1)

# Creates and names a library, sets it as either STATIC
# or SHARED, and provides the relative paths to its source code.
# You can define multiple libraries, and CMake builds them for you.
# Gradle automatically packages shared libraries with your APK.

set(PACKAGE_NAME "comm_jni_module")

find_package(fbjni REQUIRED CONFIG)

include_directories(
  ../../node_modules/react-native/React
  ../../node_modules/react-native/React/Base
  ../../node_modules/react-native/ReactCommon
  ../../node_modules/react-native/ReactCommon/jsi
  ../../node_modules/react-native/ReactCommon/callinvoker
  ../../node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/ReactCommon
  ../../node_modules/react-native/ReactCommon/turbomodule/core
  ./src/cpp/
  ../../CommonCpp/NativeModules
)

# search for all cpp files in this directory
file(GLOB NATIVE_MODULES "../../CommonCpp/NativeModules/*.cpp")

add_library(
  # Sets the name of the library.
  ${PACKAGE_NAME}
  # Sets the library as a shared library.
  SHARED
  # Provides a relative path to your source file(s).
  ../../node_modules/react-native/ReactCommon/jsi/jsi/jsi.cpp
  ../../node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/ReactCommon/CallInvokerHolder.cpp
  ../../node_modules/react-native/ReactCommon/turbomodule/core/TurboModule.cpp
  ./src/cpp/jsiInstaller.cpp
  ${NATIVE_MODULES}
)

target_link_libraries(
  ${PACKAGE_NAME}
  fbjni::fbjni
  android
  log
)

# add a dummy library which is required by CallInvokerHolderImpl.java
add_library(
  turbomodulejsijni
  # Sets the library as a shared library.
  SHARED
  # Provides a relative path to your source file(s).
  ./src/cpp/dummy.cpp
)