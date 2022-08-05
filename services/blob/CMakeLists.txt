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
include(./cmake-components/grpc.cmake)
include(./cmake-components/folly.cmake)
add_subdirectory(./lib/glog)
find_package(AWSSDK REQUIRED COMPONENTS s3 core dynamodb)
find_package(Boost 1.40 COMPONENTS program_options REQUIRED)
find_package(OpenSSL REQUIRED)

# FIND FILES
file(GLOB DOUBLE_CONVERSION_SOURCES
  "./lib/double-conversion/double-conversion/*.cc"
)

file(GLOB GENERATED_CODE "./_generated/*.cc")

file(GLOB_RECURSE SOURCE_CODE "./src/*.cpp")

include_directories(
  ./src
  ./src/server-base-reactors
  ./src/DatabaseEntities
  ./src/Reactors/
  ./src/Reactors/server
  ./src/Reactors/server/base-reactors
  ./_generated
  ${FOLLY_INCLUDES}
  ./lib/double-conversion
  ${Boost_INCLUDE_DIR}
)

# SERVER
add_executable(
  blob

  ${GENERATED_CODE}
  ${DOUBLE_CONVERSION_SOURCES}
  ${FOLLY_SOURCES}

  ${SOURCE_CODE}
)

set(
  LIBS

  ${GRPC_LIBS}
  ${AWSSDK_LINK_LIBRARIES}
  ${Boost_LIBRARIES}
  OpenSSL::SSL
  glog::glog
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
