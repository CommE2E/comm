project(grpc-comm)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)
find_package(protobuf REQUIRED)
find_package(gRPC REQUIRED)

set(CMAKE_CXX_STANDARD 14)

add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../../../../shared/protos"
  "${CMAKE_CURRENT_BINARY_DIR}/protos"
)

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
  comm-tunnelbroker-grpc
)

target_include_directories(comm-client
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/..>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../Tools>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
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

# For development purposes, able to reference build directory
export(TARGETS comm-client
  NAMESPACE comm::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/cmake/comm/comm-grpc-client-targets.cmake
)

# For installation
install(EXPORT comm-export
  FILE comm-grpc-targets.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-grpc
  NAMESPACE comm-grpc::
)
