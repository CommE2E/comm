PROJECT(tunnelbroker C CXX)

cmake_minimum_required(VERSION 3.16)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY bin)

if(COMMAND cmake_policy)
  cmake_policy(SET CMP0003 NEW)
endif(COMMAND cmake_policy)

set(CMAKE_CXX_STANDARD 17)

find_package(PkgConfig REQUIRED)

# FIND LIBS
include(./cmake-components/grpc.cmake)
include(./cmake-components/folly.cmake)

# Find AMQP-CPP installation
find_package(amqpcpp CONFIG REQUIRED)

# Find Cryptopp installation
pkg_check_modules(CRYPTOPP REQUIRED libcryptopp=8.6)

# Find Libuv installation
pkg_check_modules(LIBUV REQUIRED libuv=1.43.0)

set(BUILD_TESTING OFF CACHE BOOL "Turn off tests" FORCE)
set(WITH_GFLAGS OFF CACHE BOOL "Turn off gflags" FORCE)

find_package(AWSSDK REQUIRED COMPONENTS core dynamodb)
find_package(Boost 1.40 COMPONENTS program_options thread system REQUIRED)
find_package(OpenSSL REQUIRED)

add_subdirectory(./lib/glog)

# Generated sources
get_filename_component(proto "protos/tunnelbroker.proto" ABSOLUTE)
get_filename_component(proto_path "${proto}" PATH)

set(GENERATED_BASE_DIR "${CMAKE_CURRENT_BINARY_DIR}/gen")
set(GENERATED_CODE_DIR "${GENERATED_BASE_DIR}/_generated")
file(MAKE_DIRECTORY ${GENERATED_CODE_DIR})

set(proto_srcs "${GENERATED_CODE_DIR}/tunnelbroker.pb.cc")
set(proto_hdrs "${GENERATED_CODE_DIR}/tunnelbroker.pb.h")
set(grpc_srcs "${GENERATED_CODE_DIR}/tunnelbroker.grpc.pb.cc")
set(grpc_hdrs "${GENERATED_CODE_DIR}/tunnelbroker.grpc.pb.h")
add_custom_command(
  OUTPUT "${proto_srcs}" "${proto_hdrs}" "${grpc_srcs}" "${grpc_hdrs}"
  COMMAND ${_PROTOBUF_PROTOC}
  ARGS --grpc_out "${GENERATED_CODE_DIR}"
  --cpp_out "${GENERATED_CODE_DIR}"
  -I "${proto_path}"
  --plugin=protoc-gen-grpc="${_GRPC_CPP_PLUGIN_EXECUTABLE}"
  "${proto}"
  DEPENDS "${proto}"
)

file(GLOB_RECURSE SOURCE_CODE "./src/*.cpp")
set(GENERATED_CODE ${proto_srcs} ${proto_hdrs} ${grpc_srcs} ${grpc_hdrs})
file(GLOB DOUBLE_CONVERSION_SOURCES "./lib/double-conversion/double-conversion/*.cc")

include_directories(
  ./src
  ./src/Database
  ./src/DeliveryBroker
  ./src/Service
  ./src/Tools
  ./src/Amqp
  ${GENERATED_BASE_DIR}
  ${FOLLY_INCLUDES}
  ./lib/double-conversion
  ${Boost_INCLUDE_DIR}
  ${CRYPTOPP_INCLUDE_DIRS}
  ${LIBUV_INCLUDE_DIRS}
)

set(
  SOURCE_CODE

  ${DOUBLE_CONVERSION_SOURCES}
  ${GENERATED_CODE}
  ${SOURCE_CODE}
)

set(
  LIBS

  ${GRPC_LIBS}
  ${_PROTOBUF_LIBPROTOBUF}
  ${_REFLECTION}
  ${AWSSDK_LINK_LIBRARIES}
  ${CRYPTOPP_LIBRARIES}
  ${LIBUV_LIBRARIES}
  ${Boost_LIBRARIES}
  amqpcpp
  OpenSSL::SSL
  glog::glog
)

#SERVER
add_executable(
  tunnelbroker

  ${FOLLY_SOURCES}
  ${GENERATED_CODE}
  ${SOURCE_CODE}
)

target_link_libraries(
  tunnelbroker

  ${LIBS}
)

install(
  TARGETS tunnelbroker
  RUNTIME DESTINATION bin/
)

# TEST
if ($ENV{COMM_TEST_SERVICES} MATCHES 1)
  file(GLOB TEST_CODE "./test/*.cpp")
  list(FILTER SOURCE_CODE EXCLUDE REGEX "./src/server.cpp")
  enable_testing()

  find_package(GTest REQUIRED)
  include_directories(${GTEST_INCLUDE_DIR})

  add_executable(
    runTests

    ${FOLLY_SOURCES}
    ${SOURCE_CODE}
    ${TEST_CODE}
  )
  target_link_libraries(
    runTests

    ${LIBS}
    gtest
    gtest_main
  )

  add_test(
    NAME runTests
    COMMAND runTests
  )
endif()
