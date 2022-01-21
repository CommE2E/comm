PROJECT(blob C CXX)

cmake_minimum_required(VERSION 3.16)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY bin)

if(COMMAND cmake_policy)
  cmake_policy(SET CMP0003 NEW)
endif(COMMAND cmake_policy)

set(CMAKE_CXX_STANDARD 17)

# FIND LIBS
set(protobuf_MODULE_COMPATIBLE TRUE)
find_package(Protobuf CONFIG REQUIRED)
message(STATUS "Using protobuf ${Protobuf_VERSION}")

set(_PROTOBUF_LIBPROTOBUF protobuf::libprotobuf)
set(_PROTOBUF_PROTOC $<TARGET_FILE:protobuf::protoc>)

# gRPC building parameters
set(gRPC_BUILD_CSHARP_EXT OFF)
set(gRPC_SSL_PROVIDER "package" CACHE STRING "SSL library provider")
# Disable unused plugins
set(gRPC_BUILD_GRPC_PHP_PLUGIN OFF)
set(gRPC_BUILD_GRPC_RUBY_PLUGIN OFF)
set(gRPC_BUILD_GRPC_PYTHON_PLUGIN OFF)
set(gRPC_BUILD_GRPC_CSHARP_PLUGIN OFF)

# Find gRPC installation
# Looks for gRPCConfig.cmake file installed by gRPC's cmake installation.
find_package(gRPC CONFIG REQUIRED)
message(STATUS "Using gRPC ${gRPC_VERSION}")

set(_GRPC_GRPCPP gRPC::grpc++)
set(_GRPC_CPP_PLUGIN_EXECUTABLE $<TARGET_FILE:gRPC::grpc_cpp_plugin>)

set(BUILD_TESTING OFF CACHE BOOL "Turn off tests" FORCE)
set(WITH_GTEST "Use Google Test" OFF)

add_definitions(
  -DFOLLY_NO_CONFIG=1
  -DFOLLY_HAVE_CLOCK_GETTIME=1
  -DFOLLY_HAVE_MEMRCHR=1
  -DFOLLY_USE_LIBCPP=0
  -DFOLLY_MOBILE=0
)

add_subdirectory(./lib/glog)

find_package(AWSSDK REQUIRED COMPONENTS s3 core dynamodb)

find_package(Boost 1.40 COMPONENTS program_options REQUIRED)

find_package(OpenSSL REQUIRED)

file(GLOB DOUBLE_CONVERSION_SOURCES "./lib/double-conversion/double-conversion/*.cc")

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
  ./_generated
  ./lib/folly
  ./lib/double-conversion
  ${Boost_INCLUDE_DIR}
  ${DEV_HEADERS_PATH}
)

set(
  FOLLY_SOURCES

  ./lib/folly/folly/detail/Futex.cpp
  ./lib/folly/folly/synchronization/ParkingLot.cpp
  ./lib/folly/folly/lang/SafeAssert.cpp
  ./lib/folly/folly/FileUtil.cpp
  ./lib/folly/folly/Subprocess.cpp
  ./lib/folly/folly/File.cpp
  ./lib/folly/folly/Format.cpp
  ./lib/folly/folly/Conv.cpp
  ./lib/folly/folly/io/IOBuf.cpp
  ./lib/folly/folly/memory/detail/MallocImpl.cpp
  ./lib/folly/folly/ScopeGuard.cpp
  ./lib/folly/folly/hash/SpookyHashV2.cpp
  ./lib/folly/folly/io/IOBufQueue.cpp
  ./lib/folly/folly/lang/Assume.cpp
  ./lib/folly/folly/String.cpp
  ./lib/folly/folly/portability/SysUio.cpp
  ./lib/folly/folly/net/NetOps.cpp
  ./lib/folly/folly/synchronization/Hazptr.cpp
  ./lib/folly/folly/detail/ThreadLocalDetail.cpp
  ./lib/folly/folly/SharedMutex.cpp
  ./lib/folly/folly/concurrency/CacheLocality.cpp
  ./lib/folly/folly/detail/StaticSingletonManager.cpp
  ./lib/folly/folly/executors/ThreadPoolExecutor.cpp
  ./lib/folly/folly/executors/GlobalThreadPoolList.cpp
  ./lib/folly/folly/Demangle.cpp
  ./lib/folly/folly/synchronization/AsymmetricMemoryBarrier.cpp
  ./lib/folly/folly/io/async/Request.cpp
  ./lib/folly/folly/detail/MemoryIdler.cpp
  ./lib/folly/folly/detail/AtFork.cpp
  ./lib/folly/folly/Executor.cpp
  ./lib/folly/folly/lang/CString.cpp
  ./lib/folly/folly/portability/SysMembarrier.cpp
  ./lib/folly/folly/container/detail/F14Table.cpp
  ./lib/folly/folly/detail/UniqueInstance.cpp
  ./lib/folly/folly/executors/QueuedImmediateExecutor.cpp
  ./lib/folly/folly/memory/MallctlHelper.cpp
)

set(
  LIBS

  ${_GRPC_GRPCPP}
  ${_PROTOBUF_LIBPROTOBUF}
  gRPC::grpc++_reflection
  ${AWSSDK_LINK_LIBRARIES}
  ${Boost_LIBRARIES}
  OpenSSL::SSL
  glog::glog
)

# SERVER
add_executable(
  blob
  
  ${GENERATED_CODE}
  ${DOUBLE_CONVERSION_SOURCES}
  ${FOLLY_SOURCES}
  
  ${SOURCE_CODE}
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
