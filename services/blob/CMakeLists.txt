PROJECT(blob C CXX)

cmake_minimum_required(VERSION 3.16)

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
file(GLOB DOUBLE_CONVERSION_SOURCES "./lib/double-conversion/double-conversion/*.cc")


if ($ENV{COMM_TEST_SERVICES} MATCHES 1)
  add_compile_definitions(COMM_TEST_SERVICES)
endif()

file(GLOB GENERATED_CODE "./_generated/*.cc")
set(DEV_SOURCE_CODE "")
set(DEV_HEADERS_PATH "")
if ($ENV{COMM_SERVICES_DEV_MODE} MATCHES 1)
  add_compile_definitions(COMM_SERVICES_DEV_MODE)
  file(GLOB DEV_SOURCE_CODE "./dev/*.cpp" "./src/*.dev.cpp" "./src/**/*.dev.cpp")
  set(DEV_HEADERS_PATH "./dev")
endif()

file(GLOB SOURCE_CODE "./src/*.cpp" "./src/**/*.cpp")
list(FILTER SOURCE_CODE EXCLUDE REGEX ".*.dev.cpp$")

foreach (ITEM ${DEV_SOURCE_CODE})
  string(REPLACE "/" ";" SPLIT_ITEM ${ITEM})
  list(GET SPLIT_ITEM -1 FILE_FULL_NAME)
  string(REPLACE ".dev.cpp" ".cpp" FILE_NAME ${FILE_FULL_NAME})
  list(FILTER SOURCE_CODE EXCLUDE REGEX ".*${FILE_NAME}$")
  list(APPEND SOURCE_CODE "${ITEM}")
endforeach()

include_directories(
  ./src
  ./src/DatabaseEntities
  ./src/Reactors/
  ./src/Reactors/server
  ./src/Reactors/server/base-reactors
  ./_generated
  ${FOLLY_INCLUDES}
  ./lib/double-conversion
  ${Boost_INCLUDE_DIR}
  ${DEV_HEADERS_PATH}
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
