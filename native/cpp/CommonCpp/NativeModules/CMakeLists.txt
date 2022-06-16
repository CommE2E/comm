project(comm-modules)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)

set(INTERNAL_HDRS
  "include/comm/Internal/GlobalNetworkSingleton.h"
  "include/comm/Internal/GlobalNetworkSingletonJNIHelper.h"
  "include/comm/Internal/NetworkModule.h"
  "include/comm/Internal/SocketStatus.h"
  )

set(INTERNAL_SRCS
  "src/Internal/GlobalNetworkSingleton.cpp"
  "src/Internal/NetworkModule.cpp"
  )

add_library(comm-modules-internal
  ${INTERNAL_HDRS}
  ${INTERNAL_SRCS}
)

target_link_libraries(comm-modules-internal
  comm-tools
  )

set(NATIVE_HDRS
  "include/comm/Native/CommCoreModule.h"
  "include/comm/Native/MessageStoreOperations.h"
  "include/comm/Native/ThreadStoreOperations.h"
  )

set(NATIVE_SRCS
  "src/Native/CommCoreModule.cpp"
  )

add_library(comm-modules-native
  ${NATIVE_HDRS}
  ${NATIVE_SRCS}
)

set_target_properties(comm-modules-native PROPERTIES LINKER_LANGUAGE CXX)

# reference local directory when building, use installation path when installing
target_include_directories(comm-modules-internal
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)

target_include_directories(comm-modules-native
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  PRIVATE
  # HACK
  "../../../node_modules/react-native/ReactCommon/jsi"
  "../../../node_modules/react-native/ReactCommon/react/nativemodule/core"
  "../../../node_modules/react-native/ReactCommon/callinvoker"
)

set(_components internal native)
foreach(_component ${_components})

  install(TARGETS comm-modules-${_component} EXPORT comm-modules-export
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT comm-modules
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-modules
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-modules
  )

endforeach()

install(FILES ${INTERNAL_HDRS} DESTINATION include/comm/Internal)
install(FILES ${NATIVE_HDRS} DESTINATION include/comm/Native)

# For development purposes, can point cmake to this directory if doing development
export(TARGETS comm-modules-internal comm-modules-native
  NAMESPACE comm-modules::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/cmake/comm-modules/comm-modules-targets.cmake
)

# For installation
install(EXPORT comm-modules-export
  FILE comm-modules-targets.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-modules
  NAMESPACE comm-modules::
)
