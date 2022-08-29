PROJECT(backup CXX)

cmake_minimum_required(VERSION 3.16)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY bin)

if(COMMAND cmake_policy)
  cmake_policy(SET CMP0003 NEW)
endif(COMMAND cmake_policy)

set(CMAKE_CXX_STANDARD 17)
# For C++17 on MacOS, we must set minimum target to 10.14+
set(CMAKE_OSX_DEPLOYMENT_TARGET 10.14)

set(BUILD_TESTING OFF CACHE BOOL "Turn off tests" FORCE)
set(WITH_GTEST "Use Google Test" OFF)

find_package(glog REQUIRED)
find_package(protobuf REQUIRED)
find_package(gRPC REQUIRED)
find_package(Folly REQUIRED)
find_package(AWSSDK REQUIRED COMPONENTS core dynamodb)
find_package(Boost 1.40
  COMPONENTS program_options context filesystem regex system thread
  REQUIRED
)

# Rust integration
include(cmake-components/corrosion-cxx.cmake)
find_package(Corrosion REQUIRED)

if(${CMAKE_CURRENT_SOURCE_DIR} MATCHES "^\/transferred.*")
  # Inside the docker build contex
  set(_proto_path "grpc")
else()
  # Inside repo
  set(_proto_path "../../native/cpp/CommonCpp/grpc")
endif()

# Shared Comm protos
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/${_proto_path}
  ${CMAKE_CURRENT_BINARY_DIR}/protos
  EXCLUDE_FROM_ALL
)

add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../lib/src
  ${CMAKE_CURRENT_BINARY_DIR}/lib/src
  EXCLUDE_FROM_ALL
)

file(GLOB_RECURSE SOURCE_CODE "./src/*.cpp")

# SERVER
add_executable(
  backup

  ${GENERATED_CODE}
  ${FOLLY_SOURCES}

  ${SOURCE_CODE}
)

add_library_rust(PATH rust_lib NAMESPACE backup)

target_include_directories(
  backup
  PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/src
  ${CMAKE_CURRENT_SOURCE_DIR}/src/DatabaseEntities
  ${CMAKE_CURRENT_SOURCE_DIR}/src/Reactors
  ${CMAKE_CURRENT_SOURCE_DIR}/src/Reactors/server
  ${CMAKE_CURRENT_SOURCE_DIR}/src/Reactors/server/base-reactors

  ${Boost_INCLUDE_DIR}
)

set(
  LIBS

  ${GRPC_LIBS}
  ${AWSSDK_LINK_LIBRARIES}
  ${Boost_LIBRARIES}
  glog::glog
  Folly::folly
  gRPC::grpc++

  comm-blob-grpc
  comm-backup-grpc
  comm-services-common
  comm-server-base-reactors
  backup::rust_lib
)

target_link_libraries(
  backup

  ${LIBS}
)

install(
  TARGETS backup
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
