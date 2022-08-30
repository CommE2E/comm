project(comm-tools)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)

find_package(Folly REQUIRED)

set(TOOLS_HDRS
  "CommSecureStore.h"
  "Logger.h"
  "PlatformSpecificTools.h"
  "WorkerThread.h"
)

set(TOOLS_SRCS
  "WorkerThread.cpp"
)

add_library(comm-tools
  ${TOOLS_HDRS}
  ${TOOLS_SRCS}
)

target_link_libraries(comm-tools
  Folly::folly
)

target_include_directories(comm-tools
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/..>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)

install(TARGETS comm-tools EXPORT comm-tools-export
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT comm-tools
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-tools
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-tools
)

install(FILES ${TOOLS_HDRS} DESTINATION include/Tools)

export(TARGETS comm-tools
  NAMESPACE comm-tools::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/cmake/comm-tools/comm-tools-targets.cmake
)

# For installation
install(EXPORT comm-tools-export
  FILE comm-tools-targets.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-tool
  NAMESPACE comm-tools::
)
