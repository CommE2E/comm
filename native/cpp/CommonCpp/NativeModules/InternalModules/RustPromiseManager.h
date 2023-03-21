#pragma once

#include "../../Tools/WorkerThread.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <folly/dynamic.h>
#include <jsi/JSIDynamic.h>

#include <atomic>

namespace comm {

using namespace facebook::react;

class RustPromiseManager {
  std::atomic<uint32_t> id{0};

  RustPromiseManager();

  uint32_t getNextID() {
    return this->id++;
  };

  uint32_t addPromiseCommonImpl(
      std::shared_ptr<Promise> promise,
      std::shared_ptr<facebook::react::CallInvoker> jsInvoker,
      facebook::jsi::Runtime &rt) {
    uint32_t id = getNextID();
    PromiseInfo info = {promise, jsInvoker, rt};
    promises.insert({id, info});
    return id;
  };

  void removePromiseCommonImpl(uint32_t id) {
    promises.erase(id);
  };

  void resolvePromiseCommonImpl(uint32_t id, folly::dynamic ret) {
    auto it = promises.find(id);
    if (it != promises.end()) {
      auto promiseInfo = it->second;
      if (promiseInfo.jsInvoker) {
        promiseInfo.jsInvoker->invokeAsync([promiseInfo, ret]() {
          promiseInfo.promise->resolve(valueFromDynamic(promiseInfo.rt, ret));
        });
      } else {
        promiseInfo.promise->resolve(valueFromDynamic(promiseInfo.rt, ret));
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
  static RustPromiseManager instance;
  uint32_t addPromise(
      std::shared_ptr<Promise> promise,
      std::shared_ptr<facebook::react::CallInvoker> jsInvoker,
      facebook::jsi::Runtime &rt);
  void removePromise(uint32_t id);
  void resolvePromise(uint32_t id, folly::dynamic ret);
  void rejectPromise(uint32_t id, const std::string &error);

  struct PromiseInfo {
    std::shared_ptr<Promise> promise;
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker;
    facebook::jsi::Runtime &rt;
  };
  std::unordered_map<uint32_t, PromiseInfo> promises;
};
} // namespace comm
