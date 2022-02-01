#pragma once

#include "../../Tools/WorkerThread.h"
#include "NetworkModule.h"
#include "SocketStatus.h"
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

  SocketStatus getSocketStatus();
};
} // namespace comm
