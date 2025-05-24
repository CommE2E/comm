#pragma once

#include <ReactCommon/TurboModuleUtils.h>
#include <ReactCommon/CallInvoker.h>
#include <folly/dynamic.h>
#include <jsi/JSIDynamic.h>

#include <atomic>
#include <future>
#include <shared_mutex>
#include <variant>

namespace comm {

class RustPromiseManager {
  std::atomic<uint32_t> id{0};

  RustPromiseManager();

  uint32_t getNextID() {
    return this->id++;
  };

public:
  static RustPromiseManager instance;

  struct JSIPromiseInfo {
    std::shared_ptr<facebook::react::Promise> promise;
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker;
    facebook::jsi::Runtime &rt;
  };

  struct CPPPromiseInfo {
    std::promise<folly::dynamic> promise;
  };

  using PromiseInfo = std::variant<JSIPromiseInfo, CPPPromiseInfo>;

  uint32_t addPromise(JSIPromiseInfo info);
  uint32_t addPromise(CPPPromiseInfo info);

  void removePromise(uint32_t id);
  void resolvePromise(uint32_t id, folly::dynamic ret);
  void rejectPromise(uint32_t id, const std::string &error);

  std::unordered_map<uint32_t, PromiseInfo> promises;
  std::shared_mutex mutex;
};

} // namespace comm
