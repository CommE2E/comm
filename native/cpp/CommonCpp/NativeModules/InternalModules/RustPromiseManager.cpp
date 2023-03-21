#include "RustPromiseManager.h"

namespace comm {
RustPromiseManager RustPromiseManager::instance;

RustPromiseManager::RustPromiseManager(){};

uint32_t RustPromiseManager::addPromise(
    std::shared_ptr<Promise> promise,
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker,
    facebook::jsi::Runtime &rt) {
  uint32_t id = getNextID();
  PromiseInfo info = {promise, jsInvoker, rt};
  // Acquire a lock for writing
  std::unique_lock<std::shared_mutex> lock(mutex);
  promises.insert({id, info});
  return id;
}

void RustPromiseManager::removePromise(uint32_t id) {
  // Acquire a lock for writing
  std::unique_lock<std::shared_mutex> lock(mutex);
  promises.erase(id);
}

void RustPromiseManager::resolvePromise(uint32_t id, folly::dynamic ret) {
  // Acquire a shared lock for reading
  std::shared_lock<std::shared_mutex> lock(mutex);
  auto it = promises.find(id);
  if (it == promises.end()) {
    return;
  }
  // Release the shared lock
  lock.unlock();
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

void RustPromiseManager::rejectPromise(uint32_t id, const std::string &error) {
  // Acquire a shared lock for reading
  std::shared_lock<std::shared_mutex> lock(mutex);
  auto it = promises.find(id);
  if (it == promises.end()) {
    return;
  }
  // Release the shared lock
  lock.unlock();
  if (it->second.jsInvoker) {
    it->second.jsInvoker->invokeAsync(
        [promise = it->second.promise, error]() { promise->reject(error); });
  } else {
    it->second.promise->reject(error);
  }
  removePromise(id);
}

} // namespace comm
