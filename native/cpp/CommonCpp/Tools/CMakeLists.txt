project(comm-tools)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)

set(TOOLS_HDRS
  "Base64.h"
  "WorkerThread.h"
  "StaffUtils.h"
  "OlmUtils.h"
  "StringUtils.h"
)

set(TOOLS_SRCS
  "Base64.cpp"
  "WorkerThread.cpp"
  "StaffUtils.cpp"
  "OlmUtils.cpp"
  "StringUtils.cpp"
)

add_library(comm-tools
  STATIC
  ${TOOLS_HDRS}
  ${TOOLS_SRCS}
)

include("${_react_native_dir}/ReactAndroid/cmake-utils/folly-flags.cmake")

target_compile_options(
        comm-tools
        PRIVATE
        ${folly_FLAGS}
)

target_link_libraries(comm-tools
  ReactAndroid::reactnative
)

target_include_directories(comm-tools
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/..>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)
