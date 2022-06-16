#pragma once

#include <comm/Internal/NetworkModule.h>
#include <comm/Tools/WorkerThread.h>
#include <functional>
#include <memory>

namespace comm {
class GlobalNetworkSingleton {
  std::unique_ptr<WorkerThread> thread;
  static NetworkModule &networkModule();

public:
  static GlobalNetworkSingleton instance;
  void scheduleOrRun(std::function<void(NetworkModule &)> &&task);
  void enableMultithreading();
};
} // namespace comm
