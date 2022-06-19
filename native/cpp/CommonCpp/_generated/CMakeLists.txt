project(comm-generated)

# 3.13+ required for CMP0079 to be set
cmake_minimum_required(VERSION 3.13)

include(GNUInstallDirs)

add_library(comm-generated
  "NativeModules.h"
  "NativeModules.cpp"
  )

target_include_directories(comm-generated
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/..>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  PRIVATE
  # HACK
  "../../../node_modules/react-native/ReactCommon/react/nativemodule/core"
  "../../../node_modules/react-native/ReactCommon/jsi"
  "../../../node_modules/react-native/ReactCommon/callinvoker"
  )

export(TARGETS comm-generated
  NAMESPACE comm-generated::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/cmake/comm-generated/comm-generated-targets.cmake
)

install(TARGETS comm-generated EXPORT comm-generated-export
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT comm-generated
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-generated
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-generated
)

install(EXPORT comm-generated-export
  FILE comm-generated-targets.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-generated
  NAMESPACE comm-generated::
)

install(FILES "NativeModules.h" DESTINATION include/generated)


