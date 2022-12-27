#pragma once

#include "../../Tools/WorkerThread.h"
#include <ReactCommon/TurboModuleUtils.h>

#include <atomic>

namespace comm {

using namespace facebook::react;

class RustNetworkingSingleton {
  std::atomic<bool> multithreadingEnabled;
  std::unique_ptr<WorkerThread> rustNetworkingThread;
  std::atomic<bool> tasksCancelled;
  std::atomic<uint32_t> id{0};

  RustNetworkingSingleton();

  void scheduleOrRunCommonImpl(const taskType task) {
    if (this->rustNetworkingThread != nullptr) {
      this->rustNetworkingThread->scheduleTask(task);
      return;
    }
    task();
  }

  void enableMultithreadingCommonImpl() {
    if (this->rustNetworkingThread == nullptr) {
      this->rustNetworkingThread =
          std::make_unique<WorkerThread>("rust-networking");
      this->multithreadingEnabled.store(true);
    }
  }

public:
  static RustNetworkingSingleton instance;
  void scheduleOrRun(const taskType task);
  void enableMultithreading();
  std::unordered_map<uint32_t, std::shared_ptr<Promise>> promises;
  uint32_t getNextID();
};
} // namespace comm
