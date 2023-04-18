project(grpc-comm)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)
find_package(Protobuf REQUIRED)
find_package(gRPC REQUIRED)

set(CMAKE_CXX_STANDARD 14)
# Allow for tools on PATH to be found
find_program(_PROTOBUF_PROTOC protoc
  HINTS "${_PROTOBUF_PROTOC}")
find_program(_GRPC_CPP_PLUGIN_EXECUTABLE grpc_cpp_plugin
  HINTS "${_GRPC_CPP_PLUGIN_EXECUTABLE}")

set(_proto_dir "${CMAKE_CURRENT_SOURCE_DIR}")
set(_components backup blob identity)
set(TARGETS)

# Iterate through each protobuf file
# and create headers, sources, and export as component library
foreach(component ${_components})
  set(LIB_NAME comm-${component}-grpc)
  set(TARGETS ${TARGETS} ${LIB_NAME})

  set(BIN_PROTO_HDRS
    ${component}.pb.h
    ${component}.grpc.pb.h
  )

  set(BIN_PROTO_SRCS
    ${component}.pb.cc
    ${component}.grpc.pb.cc
  )

  set(_proto_file "${_proto_dir}/${component}.proto")
  # Generate headers from protobuf files, and copy them to _generated dir
  add_custom_command(
    OUTPUT ${BIN_PROTO_HDRS} ${BIN_PROTO_SRCS}
    COMMAND ${_PROTOBUF_PROTOC} --grpc_out "${CMAKE_CURRENT_BINARY_DIR}"
    --cpp_out "${CMAKE_CURRENT_BINARY_DIR}"
    -I "${_proto_dir}"
    --plugin=protoc-gen-grpc="${_GRPC_CPP_PLUGIN_EXECUTABLE}"
    "${_proto_file}"
    COMMAND sed 's|^// Genera|// @genera|g' ${component}.grpc.pb.h
      > ${CMAKE_CURRENT_SOURCE_DIR}/_generated/${component}.grpc.pb.h
    COMMAND sed 's|^// Genera|// @genera|g' ${component}.grpc.pb.cc
      > ${CMAKE_CURRENT_SOURCE_DIR}/_generated/${component}.grpc.pb.cc
    COMMAND sed 's|^// Genera|// @genera|g' ${component}.pb.h
      > ${CMAKE_CURRENT_SOURCE_DIR}/_generated/${component}.pb.h
    COMMAND sed 's|^// Genera|// @genera|g' ${component}.pb.cc
      > ${CMAKE_CURRENT_SOURCE_DIR}/_generated/${component}.pb.cc
    DEPENDS "${_proto_file}"
    MAIN_DEPENDENCY "${_proto_file}"
    COMMENT "Generate protobuf files for ${component}"
  )

  add_library(${LIB_NAME}
    ${BIN_PROTO_HDRS} ${BIN_PROTO_SRCS}
  )

  target_link_libraries(${LIB_NAME}
    gRPC::grpc++
    protobuf::libprotobuf
  )

  # reference local directory when building
  # use installation path when installing
  target_include_directories(${LIB_NAME}
    PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}>
    $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  )

  install(TARGETS ${LIB_NAME} EXPORT comm-grpc-export
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT ${LIB_NAME}
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT ${LIB_NAME}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT ${LIB_NAME}
  )

  # ensure headers are also installed
  install(FILES ${PROTO_HDRS} DESTINATION include/comm/grpc)
endforeach()

export(TARGETS ${TARGETS}
  NAMESPACE comm::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/cmake/comm/comm-grpc-targets.cmake
)

# For installation
install(EXPORT comm-grpc-export
  FILE comm-grpc-targets.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-grpc
  NAMESPACE comm::
)
