PROJECT(tunnelbroker-libcpp C CXX)

cmake_minimum_required(VERSION 3.16)

# To fix full path libraries linking we are using the CMP0003 policy
# https://cmake.org/cmake/help/latest/policy/CMP0003.html
if(COMMAND cmake_policy)
  cmake_policy(SET CMP0003 NEW)
endif(COMMAND cmake_policy)

set(CMAKE_CXX_STANDARD 17)

# For C++17 on MacOS, we must set minimum target to 10.14+
set(CMAKE_OSX_DEPLOYMENT_TARGET 10.14)

option(BUILD_TESTING "Build test suite" ON)
option(WITH_GFLAGS "Turn on GFLAGS" ON)
enable_testing()

find_package(PkgConfig REQUIRED)
find_package(double-conversion REQUIRED)
find_package(Folly REQUIRED)
find_package(amqpcpp CONFIG REQUIRED)
find_package(AWSSDK REQUIRED COMPONENTS
  core
  dynamodb
)
find_package(Boost 1.40 REQUIRED COMPONENTS
  system
  program_options
  context
  filesystem
  regex
  thread
)
find_package(OpenSSL REQUIRED)
find_package(glog REQUIRED)
find_package(GTest REQUIRED)

# Find Libuv installation
pkg_check_modules(LIBUV
  REQUIRED
  IMPORTED_TARGET
  libuv>=1.43
)

file(GLOB_RECURSE SHARED_CODE "../../../../lib/src/*.cpp")
file(GLOB_RECURSE SOURCE_CODE "../src/*.cpp")
file(GLOB TEST_CODE "*.cpp")

set(SHARED_INCLUDE_DIRS ../../../../lib/src)
set(
  INCLUDE_DIRS

  ../src
  ../src/Database
  ../src/DeliveryBroker
  ../src/Service
  ../src/Tools
  ../src/Amqp
)

set(
  LIBS

  ${AWSSDK_LINK_LIBRARIES}
  ${Boost_LIBRARIES}
  PkgConfig::LIBUV
  amqpcpp
  OpenSSL::SSL
  glog::glog
  double-conversion::double-conversion
  Folly::folly
)

add_executable(
  runTests

  ${SHARED_CODE}
  ${SOURCE_CODE}
  ${TEST_CODE}
)
target_link_libraries(
  runTests

  ${LIBS}
  gtest
  gtest_main
)

target_include_directories(
  runTests
  PUBLIC

  ${INCLUDE_DIRS}
  ${SHARED_INCLUDE_DIRS}
)

include(GoogleTest)
gtest_discover_tests(runTests)
