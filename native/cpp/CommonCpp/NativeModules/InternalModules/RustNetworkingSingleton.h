#pragma once

#include "../../Tools/WorkerThread.h"
#include <ReactCommon/TurboModuleUtils.h>

#include <atomic>

namespace comm {

using namespace facebook::react;

class RustNetworkingSingleton {
  std::atomic<bool> multithreadingEnabled;
  std::unique_ptr<WorkerThread> rustNetworkingThread;
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
  uint32_t getNextID();

public:
  static RustNetworkingSingleton instance;
  void scheduleOrRun(const taskType task);
  void enableMultithreading();
  uint32_t addPromise(
      std::shared_ptr<Promise> promise,
      std::shared_ptr<facebook::react::CallInvoker> jsInvoker);
  void removePromise(uint32_t id);
  void resolvePromise(uint32_t id, facebook::jsi::Value value);
  void rejectPromise(uint32_t id, const std::string &error);

  struct PromiseInfo {
    std::shared_ptr<Promise> promise;
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker;
  };
  std::unordered_map<uint32_t, std::shared_ptr<PromiseInfo>> promises;
};
} // namespace comm
