PROJECT(backup C CXX)

cmake_minimum_required(VERSION 3.16)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY bin)

if(COMMAND cmake_policy)
  cmake_policy(SET CMP0003 NEW)
endif(COMMAND cmake_policy)

set(CMAKE_CXX_STANDARD 14)

# FIND LIBS
set(protobuf_MODULE_COMPATIBLE TRUE)
find_package(Protobuf CONFIG REQUIRED)
message(STATUS "Using protobuf ${Protobuf_VERSION}")

set(_PROTOBUF_LIBPROTOBUF protobuf::libprotobuf)
set(_PROTOBUF_PROTOC $<TARGET_FILE:protobuf::protoc>)

# Find gRPC installation
# Looks for gRPCConfig.cmake file installed by gRPC's cmake installation.
find_package(gRPC CONFIG REQUIRED)
message(STATUS "Using gRPC ${gRPC_VERSION}")

set(_GRPC_GRPCPP gRPC::grpc++)
set(_GRPC_CPP_PLUGIN_EXECUTABLE $<TARGET_FILE:gRPC::grpc_cpp_plugin>)

set(BUILD_TESTING OFF CACHE BOOL "Turn off tests" FORCE)

find_package(AWSSDK REQUIRED COMPONENTS s3 core)

file(GLOB GENERATED_CODE "./_generated/*.cc")
file(GLOB SOURCE_CODE "./src/*.cpp")

include_directories(
  ./src
  ./_generated
)

#SERVER
add_executable(
  backup
  
  ${GENERATED_CODE}
  
  ${SOURCE_CODE}
)

target_link_libraries(
  backup
  
  ${_GRPC_GRPCPP}
  ${_PROTOBUF_LIBPROTOBUF}
  gRPC::grpc++_reflection
  ${AWSSDK_LINK_LIBRARIES}
)

install(
  TARGETS backup
  RUNTIME DESTINATION bin/
)
