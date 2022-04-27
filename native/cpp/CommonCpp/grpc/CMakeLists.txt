project(grpc-comm)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)

# CMake find modules
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")
find_package(GRPCComm REQUIRED)

set(PROTO_DEST_DIR ${CMAKE_CURRENT_BINARY_DIR})
set(PROTO_SRC_DIR ${CMAKE_CURRENT_SOURCE_DIR})

file(MAKE_DIRECTORY ${PROTO_DEST_DIR})

set(_components backup blob tunnelbroker)
# Iterate through each protobuf file, create headers, sources, and export as component library
foreach(_component ${_components})
  set(proto_file ${CMAKE_CURRENT_SOURCE_DIR}/protos/${_component}.proto)

  # generate the protobuf and grpc files
  protobuf_generate_cpp(PROTO_SRCS PROTO_HDRS ${proto_file})
  grpc_generate_cpp(GRPC_SRCS GRPC_HDRS ${proto_file})

  add_library(${_component}
    ${PROTO_HDRS} ${PROTO_SRCS} ${GRPC_HDRS} ${GRPC_SRCS}
  )

  target_link_libraries(${_component}
    gRPC::grpc++
    protobuf::libprotobuf
  )

  # reference local directory when building, use installation path when installing
  target_include_directories(${_component}
    PUBLIC
    $<BUILD_INTERFACE:${PROTO_DEST_DIR}>
    $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  )

  install(TARGETS ${_component} EXPORT comm-export
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT ${_component}
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT ${_component}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT ${_component}
  )

  # ensure headers are also installed
  install(FILES ${PROTO_HDRS} ${GRPC_HDRS} DESTINATION include/comm/grpc)
endforeach()

set(CLIENT_HDRS
  "include/comm/grpc/Client.h"
  "include/comm/grpc/ClientGetReadReactor.h"
  "include/comm/grpc/GRPCStreamHostObject.h"
  )
set(CLIENT_SRCS
  "src/Client.cpp"
  "src/ClientGetReadReactor.cpp"
  "src/GRPCStreamHostObject.cpp"
  )

add_library(client
  ${CLIENT_HDRS}
  ${CLIENT_SRCS}
)

target_link_libraries(client
  gRPC::grpc++
  protobuf::libprotobuf
  tunnelbroker
)

# reference local directory when building, use installation path when installing
target_include_directories(client
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  # HACK: add complete cmake support to react-native?
  PRIVATE
  "../../../node_modules/react-native/ReactCommon/callinvoker"
  "../../../node_modules/react-native/ReactCommon/jsi"
)

install(TARGETS client EXPORT comm-export
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT client
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT client
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT client
)

install(FILES ${CLIENT_HDRS} DESTINATION include/comm/grpc)

# For development purposes, can point cmake to this directory if doing development
export(TARGETS ${_components} client
  NAMESPACE comm-grpc::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/cmake/comm-grpc/comm-grpc-targets.cmake
)

# For installation
install(EXPORT comm-export
  FILE comm-grpc-targets.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-grpc
  NAMESPACE comm-grpc::
)
