#pragma once

#include <ReactCommon/TurboModuleUtils.h>
#include <folly/dynamic.h>
#include <jsi/JSIDynamic.h>

#include <atomic>
#include <shared_mutex>

namespace comm {

class RustPromiseManager {
  std::atomic<uint32_t> id{0};

  RustPromiseManager();

  uint32_t getNextID() {
    return this->id++;
  };

public:
  static RustPromiseManager instance;
  uint32_t addPromise(
      std::shared_ptr<facebook::react::Promise> promise,
      std::shared_ptr<facebook::react::CallInvoker> jsInvoker,
      facebook::jsi::Runtime &rt);
  void removePromise(uint32_t id);
  void resolvePromise(uint32_t id, folly::dynamic ret);
  void rejectPromise(uint32_t id, const std::string &error);

  struct PromiseInfo {
    std::shared_ptr<facebook::react::Promise> promise;
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker;
    facebook::jsi::Runtime &rt;
  };
  std::unordered_map<uint32_t, PromiseInfo> promises;
  std::shared_mutex mutex;
};

} // namespace comm
