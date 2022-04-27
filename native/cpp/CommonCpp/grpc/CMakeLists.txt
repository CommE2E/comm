project(grpc-comm)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)
find_package(protobuf REQUIRED)
find_package(gRPC REQUIRED)

set(_components backup blob tunnelbroker)
# Iterate through each protobuf file, create headers, sources, and export as component library
foreach(_component ${_components})
  set(PROTO_HDRS
    ${CMAKE_CURRENT_SOURCE_DIR}/_generated/${_component}.pb.h
    ${CMAKE_CURRENT_SOURCE_DIR}/_generated/${_component}.grpc.pb.h
  )

set(PROTO_SRCS
    ${CMAKE_CURRENT_SOURCE_DIR}/_generated/${_component}.pb.cc
    ${CMAKE_CURRENT_SOURCE_DIR}/_generated/${_component}.grpc.pb.cc
  )

  add_library(${_component}
    ${PROTO_HDRS} ${PROTO_SRCS}
  )

  target_link_libraries(${_component}
    gRPC::grpc++
    protobuf::libprotobuf
  )

  # reference local directory when building, use installation path when installing
  target_include_directories(${_component}
    PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/_generated>
    $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  )

  install(TARGETS ${_component} EXPORT comm-export
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT ${_component}
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT ${_component}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT ${_component}
  )

  # ensure headers are also installed
  install(FILES ${PROTO_HDRS} DESTINATION include/comm/grpc)
endforeach()

set(CLIENT_HDRS
  "Client.h"
  "ClientGetReadReactor.h"
  "GRPCStreamHostObject.h"
)

set(CLIENT_SRCS
  "Client.cpp"
  "ClientGetReadReactor.cpp"
  "GRPCStreamHostObject.cpp"
)

add_library(comm-client
  ${CLIENT_HDRS}
  ${CLIENT_SRCS}
)

target_link_libraries(comm-client
  gRPC::grpc++
  protobuf::libprotobuf
  tunnelbroker
)

# reference local directory when building, use installation path when installing
target_include_directories(comm-client
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/..>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  # HACK: add complete cmake support to react-native?
  PRIVATE
  "../../../node_modules/react-native/ReactCommon/callinvoker"
  "../../../node_modules/react-native/ReactCommon/jsi"
)

install(TARGETS comm-client EXPORT comm-export
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT comm-client
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-client
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-client
)

install(FILES ${CLIENT_HDRS} DESTINATION include/grpc)

# For development purposes, can point cmake to this directory if doing development
export(TARGETS ${_components} comm-client
  NAMESPACE comm-grpc::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/cmake/comm-grpc/comm-grpc-targets.cmake
)

# For installation
install(EXPORT comm-export
  FILE comm-grpc-targets.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-grpc
  NAMESPACE comm-grpc::
)
