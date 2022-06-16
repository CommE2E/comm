project(comm-tools)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)

find_package(Folly REQUIRED)

set(TOOLS_HDRS
  "include/comm/Tools/CommSecureStore.h"
  "include/comm/Tools/Logger.h"
  "include/comm/Tools/PlatformSpecificTools.h"
  "include/comm/Tools/WorkerThread.h"
  )

set(TOOLS_SRCS
  "src/WorkerThread.cpp"
  )

add_library(comm-tools
  ${TOOLS_HDRS}
  ${TOOLS_SRCS}
)

target_link_libraries(comm-tools
  Folly::folly
  )

# reference local directory when building, use installation path when installing
target_include_directories(comm-tools
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)

install(TARGETS comm-tools EXPORT comm-tools-export
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT comm-tools
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-tools
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-tools
)

install(FILES ${TOOLS_HDRS} DESTINATION include/comm/Tools)

# For development purposes, can point cmake to this directory if doing development
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
