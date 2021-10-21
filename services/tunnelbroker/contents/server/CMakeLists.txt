PROJECT(tunnelbroker C CXX)

cmake_minimum_required(VERSION 3.16)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY bin)

if(COMMAND cmake_policy)
  cmake_policy(SET CMP0003 NEW)
endif(COMMAND cmake_policy)

set (CMAKE_CXX_STANDARD 14)

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
set(WITH_GFLAGS OFF CACHE BOOL "Use gflags" FORCE)

add_subdirectory(./lib/glog)

file(GLOB SOURCE_CODE "./src/*.cpp")
file(GLOB GENERATED_CODE "./_generated/*.cc")
file(GLOB DOUBLE_CONVERSION_SOURCES "./lib/double-conversion/double-conversion/*.cc")

add_definitions(
  -DFOLLY_NO_CONFIG=1
  -DFOLLY_HAVE_CLOCK_GETTIME=1
  -DFOLLY_HAVE_MEMRCHR=1
  -DFOLLY_USE_LIBCPP=0
  -DFOLLY_MOBILE=0
)

include_directories(
  ./src
  ./_generated
  ./lib/folly
  ./lib/double-conversion
)

#SERVER
add_executable(
  tunnelbroker

  # folly
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

  ${DOUBLE_CONVERSION_SOURCES}
  
  ${GENERATED_CODE}
  
  ${SOURCE_CODE}
)

target_link_libraries(
  tunnelbroker
  
  ${_GRPC_GRPCPP}
  ${_PROTOBUF_LIBPROTOBUF}
  gRPC::grpc++_reflection
  glog::glog
)

install(
  TARGETS tunnelbroker
  RUNTIME DESTINATION bin/
)
