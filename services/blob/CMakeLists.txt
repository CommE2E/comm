PROJECT(blob C CXX)

cmake_minimum_required(VERSION 3.16)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY bin)

if(COMMAND cmake_policy)
  cmake_policy(SET CMP0003 NEW)
endif(COMMAND cmake_policy)

set(CMAKE_CXX_STANDARD 17)

set(BUILD_TESTING OFF CACHE BOOL "Turn off tests" FORCE)
set(WITH_GTEST "Use Google Test" OFF)

# FIND LIBS
find_package(glog REQUIRED)
find_package(Protobuf REQUIRED)
find_package(gRPC REQUIRED)
find_package(Folly REQUIRED)
find_package(AWSSDK REQUIRED COMPONENTS s3 core dynamodb)
find_package(Boost 1.40
  COMPONENTS program_options filesystem context regex system thread
  REQUIRE
)
find_package(OpenSSL REQUIRED)
find_package(double-conversion REQUIRED)

if(${CMAKE_CURRENT_SOURCE_DIR} MATCHES "^\/transferred.*")
  # Inside the docker build contex
  set(_proto_path "grpc")
else()
  # Inside repo
  set(_proto_path "../../shared/protos")
endif()

# Shared Comm protos
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/${_proto_path}
  ${CMAKE_CURRENT_BINARY_DIR}/protos
  EXCLUDE_FROM_ALL
)

# Reference native/cpp projects
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../lib/src
  ${CMAKE_CURRENT_BINARY_DIR}/common # CMake's build directory
  EXCLUDE_FROM_ALL # Don't build everything, just what we need
)

# FIND FILES
file(GLOB DOUBLE_CONVERSION_SOURCES
  "./lib/double-conversion/double-conversion/*.cc"
)
file(GLOB COMMON_CODE "${CMAKE_CURRENT_SOURCE_DIR}/../lib/src/*.cpp")
file(GLOB_RECURSE SOURCE_CODE "./src/*.cpp")

# SERVER
add_executable(
  blob

  ${GENERATED_CODE}
  ${DOUBLE_CONVERSION_SOURCES}
  ${FOLLY_SOURCES}

  ${SOURCE_CODE}
  ${COMMON_CODE}
)

target_include_directories(
  blob
  PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/src
  ${CMAKE_CURRENT_SOURCE_DIR}/src/server-base-reactors
  ${CMAKE_CURRENT_SOURCE_DIR}/src/DatabaseEntities
  ${CMAKE_CURRENT_SOURCE_DIR}/src/Reactors/
  ${CMAKE_CURRENT_SOURCE_DIR}/src/Reactors/server
  ${CMAKE_CURRENT_SOURCE_DIR}/src/Reactors/server/base-reactors

  # Ideally, we would add comm-services-common as a
  # target link library, however, aws-sdk seems to not be able
  # to be linked transitively
  ${CMAKE_CURRENT_SOURCE_DIR}/../lib/src

  ${Boost_INCLUDE_DIR}
)

set(
  LIBS

  ${GRPC_LIBS}
  ${AWSSDK_LINK_LIBRARIES}
  ${Boost_LIBRARIES}
  OpenSSL::SSL
  glog::glog
  gRPC::grpc++
  double-conversion::double-conversion
  Folly::folly

  comm-blob-grpc
  comm-server-base-reactors
)

target_link_libraries(
  blob

  ${LIBS}
)

install(
  TARGETS blob
  RUNTIME DESTINATION bin/
)

# TEST
if ($ENV{COMM_TEST_SERVICES} MATCHES 1)
  file(GLOB TEST_CODE "./test/*.cpp")
  list(FILTER SOURCE_CODE EXCLUDE REGEX "./src/server.cpp")
  enable_testing()

  find_package(GTest REQUIRED)
  include_directories(
    ${GTEST_INCLUDE_DIR}
    ./test
  )

  add_executable(
    runTests

    ${GENERATED_CODE}
    ${DOUBLE_CONVERSION_SOURCES}
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
