project(comm-modules)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)

set(INTERNAL_HDRS
  "InternalModules/GlobalNetworkSingleton.h"
  "InternalModules/GlobalNetworkSingletonJNIHelper.h"
  "InternalModules/NetworkModule.h"
  "InternalModules/SocketStatus.h"
)

set(INTERNAL_SRCS
  "InternalModules/GlobalNetworkSingleton.cpp"
  "InternalModules/NetworkModule.cpp"
)

add_library(comm-modules-internal
  ${INTERNAL_HDRS}
  ${INTERNAL_SRCS}
)

target_link_libraries(comm-modules-internal
  comm-tools
)

target_include_directories(comm-modules-internal
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../Tools>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../DatabaseManagers>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)

set(NATIVE_HDRS
  "CommCoreModule.h"
  "MessageStoreOperations.h"
  "ThreadStoreOperations.h"
)

set(NATIVE_SRCS
  "CommCoreModule.cpp"
)

add_library(comm-modules-native
  ${NATIVE_HDRS}
  ${NATIVE_SRCS}
)

set_target_properties(comm-modules-native PROPERTIES LINKER_LANGUAGE CXX)

# reference local directory when building, use installation path when installing
target_include_directories(comm-modules-native
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../Tools>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../DatabaseManagers>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)

target_include_directories(comm-modules-native
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  PRIVATE
  # HACK
  "../../../node_modules/react-native/ReactCommon/jsi"
  "../../../node_modules/react-native/ReactCommon/react/nativemodule/core"
  "../../../node_modules/react-native/ReactCommon/callinvoker"
)

set(MESSAGE_HDRS
  ./PersistentStorageUtilities/MessageOperationsUtilities/MessageOperationsUtilities.h
  ./PersistentStorageUtilities/MessageOperationsUtilities/MessageSpecs.h
)

set(MESSAGE_SRCS
  ./PersistentStorageUtilities/MessageOperationsUtilities/MessageOperationsUtilities.h
)

file(GLOB MESSAGE_SPEC_HDRS
  ./PersistentStorageUtilities/MessageOperationsUtilities/MessageSpecs/*.h
)

file(GLOB THREAD_OP_HDRS
  ./PersistentStorageUtilities/ThreadOperationsUtilities/*.h
)
set(THREAD_OP_SRCS
  ./PersistentStorageUtilities/ThreadOperationsUtilities/ThreadOperations.cpp
)

add_library(comm-modules-persistentstorage
  ${MESSAGE_HDRS}
  ${MESSAGE_SRCS}
  ${MESSAGE_SPEC_HDRS}
  ${THREAD_OP_HDRS}
  ${THREAD_OP_SRCS}
)

# reference local directory when building, use installation path when installing
target_include_directories(comm-modules-persistentstorage
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../Tools>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  PRIVATE
  # HACK
  "../../../node_modules/react-native/ReactCommon/jsi"
)

set(_components internal native persistentstorage)
foreach(_component ${_components})

  install(TARGETS comm-modules-${_component} EXPORT comm-modules-export
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT comm-modules
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-modules
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-modules
  )

endforeach()

install(FILES ${INTERNAL_HDRS} DESTINATION include/InternalModules)
install(FILES ${NATIVE_HDRS} DESTINATION include/NativeModules)
install(FILES ${MESSAGE_HDRS} DESTINATION include/PersistentStorageUtilities)
install(FILES ${MESSAGE_SPEC_HDRS} DESTINATION include/PersistentStorageUtilities/MessageSpecs)
install(FILES ${THREAD_OP_HDRS} DESTINATION include/ThreadOperationsUtilities)

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
