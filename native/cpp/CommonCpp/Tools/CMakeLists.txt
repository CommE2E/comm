project(comm-tools)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)

set(TOOLS_HDRS
  "CommSecureStore.h"
  "Logger.h"
  "PlatformSpecificTools.h"
  "WorkerThread.h"
)

set(TOOLS_SRCS
  "WorkerThread.cpp"

  # Can be moved to local directory in https://linear.app/comm/issue/ENG-2996
  ${_android_cpp_source_dir}/CommSecureStore.cpp
  ${_android_cpp_source_dir}/Logger.cpp
  ${_android_cpp_source_dir}/PlatformSpecificTools.cpp
)

add_library(comm-tools
  SHARED
  ${TOOLS_HDRS}
  ${TOOLS_SRCS}
)

target_link_libraries(comm-tools
  fbjni::fbjni
  Folly::folly
  Olm::Olm
  ${log-lib}
)

target_include_directories(comm-tools
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/..>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)
