add_definitions(
  -DFOLLY_NO_CONFIG=1
  -DFOLLY_HAVE_CLOCK_GETTIME=1
  -DFOLLY_HAVE_MEMRCHR=1
  -DFOLLY_USE_LIBCPP=0
  -DFOLLY_MOBILE=0
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
  FOLLY_INCLUDES

  ./lib/folly
)
