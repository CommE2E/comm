PROJECT(tunnelbroker C CXX)

cmake_minimum_required(VERSION 3.16)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY bin)

if(COMMAND cmake_policy)
  cmake_policy(SET CMP0003 NEW)
endif(COMMAND cmake_policy)

set(CMAKE_CXX_STANDARD 17)

# For C++17 on MacOS, we must set minimum target to 10.14+
set(CMAKE_OSX_DEPLOYMENT_TARGET 10.14)

find_package(PkgConfig REQUIRED)
find_package(double-conversion REQUIRED)
find_package(Folly REQUIRED)
find_package(Protobuf CONFIG REQUIRED)
find_package(gRPC CONFIG REQUIRED)
find_package(amqpcpp CONFIG REQUIRED)
find_package(AWSSDK REQUIRED COMPONENTS core dynamodb)
find_package(Boost 1.40
  COMPONENTS program_options thread system context filesystem regex
  REQUIRED
)
find_package(OpenSSL REQUIRED)
find_package(glog)

# Find Cryptopp installation
pkg_check_modules(CRYPTOPP
  REQUIRED
  IMPORTED_TARGET
  libcryptopp=8.6
)

# Find Libuv installation
pkg_check_modules(LIBUV
  REQUIRED
  IMPORTED_TARGET
  libuv>=1.43
)

set(_shared_path "../../shared")
set(_proto_path "${_shared_path}/protos")
set(_shared_cmake "${_shared_path}/cmake")

# Shared Comm protos
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/${_proto_path}
  ${CMAKE_CURRENT_BINARY_DIR}/protos
  EXCLUDE_FROM_ALL
)

# Shared services code
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../lib/src
  ${CMAKE_CURRENT_BINARY_DIR}/lib/src
  EXCLUDE_FROM_ALL
)

# Corrosion and CXX Rust integration
find_package(Corrosion REQUIRED)
include(${_shared_cmake}/corrosion-cxx.cmake)
add_library_rust(PATH rust-lib NAMESPACE rust)

file(GLOB_RECURSE SOURCE_CODE "./src/*.cpp")

set(
  LIBS

  comm-services-common
  comm-tunnelbroker-grpc

  gRPC::grpc++_reflection
  gRPC::grpc++
  ${AWSSDK_LINK_LIBRARIES}
  PkgConfig::CRYPTOPP
  PkgConfig::LIBUV
  ${Boost_LIBRARIES}
  ${RUST_LIBS}
  amqpcpp
  OpenSSL::SSL
  glog::glog
  double-conversion::double-conversion
  Folly::folly
  rust::rust-lib
)

# SERVER
add_executable(
  tunnelbroker

  ${SOURCE_CODE}
)

set(
  INCLUDE_DIRS
  ${CMAKE_CURRENT_SOURCE_DIR}/src
  ${CMAKE_CURRENT_SOURCE_DIR}/src/Database
  ${CMAKE_CURRENT_SOURCE_DIR}/src/DeliveryBroker
  ${CMAKE_CURRENT_SOURCE_DIR}/src/Service
  ${CMAKE_CURRENT_SOURCE_DIR}/src/Tools
  ${CMAKE_CURRENT_SOURCE_DIR}/src/Amqp
)

target_include_directories(
  tunnelbroker
  PUBLIC
  ${INCLUDE_DIRS}
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
option(BUILD_TESTING "Build test suite" ON)
option(WITH_GFLAGS "Turn on GFLAGS" ON)

if(BUILD_TESTING)
  file(GLOB TEST_CODE "./test/*.cpp")
  list(FILTER SOURCE_CODE EXCLUDE REGEX "./src/server.cpp")
  enable_testing()

  find_package(GTest CONFIG REQUIRED)

  add_executable(
    runTests

    ${SOURCE_CODE}
    ${TEST_CODE}
  )
  target_link_libraries(
    runTests

    ${LIBS}
    GTest::gtest_main
  )

  target_include_directories(
    runTests
    PUBLIC
    ${INCLUDE_DIRS}
  )

  include(GoogleTest)
  gtest_discover_tests(runTests)
endif()
