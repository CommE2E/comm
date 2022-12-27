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

  void scheduleCommonImpl(const taskType task) {
    if (this->rustNetworkingThread == nullptr) {
      return;
    }
    this->rustNetworkingThread->scheduleTask(task);
  }

  void enableMultithreadingCommonImpl() {
    if (this->rustNetworkingThread == nullptr) {
      this->rustNetworkingThread =
          std::make_unique<WorkerThread>("rust-networking");
      this->multithreadingEnabled.store(true);
    }
  }
  uint32_t getNextID() {
    return this->id++;
  };

  uint32_t addPromiseCommonImpl(
      std::shared_ptr<Promise> promise,
      std::shared_ptr<facebook::react::CallInvoker> jsInvoker) {
    uint32_t id = getNextID();
    PromiseInfo info = {promise, jsInvoker};
    promises.insert({id, info});
    return id;
  };

  void removePromiseCommonImpl(uint32_t id) {
    promises.erase(id);
  };

  void resolvePromiseCommonImpl(uint32_t id, double ret) {
    auto it = promises.find(id);
    if (it != promises.end()) {
      if (it->second.jsInvoker) {
        auto promiseInfo = it->second;
        it->second.jsInvoker->invokeAsync([promiseInfo2 = promiseInfo, ret]() {
          promiseInfo2.promise->resolve(facebook::jsi::Value(ret));
        });
      } else {
        it->second.promise->resolve(facebook::jsi::Value(ret));
      }
      removePromise(id);
    }
  };

  void rejectPromiseCommonImpl(uint32_t id, const std::string &error) {
    auto it = promises.find(id);
    if (it != promises.end()) {
      if (it->second.jsInvoker) {
        it->second.jsInvoker->invokeAsync(
            [promise = it->second.promise, error]() {
              promise->reject(error);
            });
      } else {
        it->second.promise->reject(error);
      }
      removePromise(id);
    }
  };

public:
  static RustNetworkingSingleton instance;
  void schedule(const taskType task);
  void enableMultithreading();
  uint32_t addPromise(
      std::shared_ptr<Promise> promise,
      std::shared_ptr<facebook::react::CallInvoker> jsInvoker);
  void removePromise(uint32_t id);
  void resolvePromise(uint32_t id, double ret);
  void rejectPromise(uint32_t id, const std::string &error);

  struct PromiseInfo {
    std::shared_ptr<Promise> promise;
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker;
  };
  std::unordered_map<uint32_t, PromiseInfo> promises;
};
} // namespace comm
