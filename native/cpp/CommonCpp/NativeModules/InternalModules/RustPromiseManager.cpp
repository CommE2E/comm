#include "RustPromiseManager.h"
#include <exception>

namespace comm {

RustPromiseManager RustPromiseManager::instance;

RustPromiseManager::RustPromiseManager() {
}

uint32_t RustPromiseManager::addPromise(JSIPromiseInfo info) {
  uint32_t id = getNextID();
  // Acquire a lock for writing
  std::unique_lock<std::shared_mutex> lock(mutex);
  promises.insert({id, std::move(info)});
  return id;
}

uint32_t RustPromiseManager::addPromise(CPPPromiseInfo info) {
  auto id = getNextID();
  std::unique_lock<std::shared_mutex> lock(mutex);
  promises.insert({id, std::move(info)});
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

  if (auto jsiPtr = std::get_if<JSIPromiseInfo>(&it->second)) {
    if (jsiPtr->jsInvoker) {
      jsiPtr->jsInvoker->invokeAsync([promiseInfo = *jsiPtr, ret]() {
        promiseInfo.promise->resolve(valueFromDynamic(promiseInfo.rt, ret));
      });
    } else {
      jsiPtr->promise->resolve(valueFromDynamic(jsiPtr->rt, ret));
    }
  } else if (auto cppPtr = std::get_if<CPPPromiseInfo>(&it->second)) {
    cppPtr->promise.set_value(ret);
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

  if (auto jsiPtr = std::get_if<JSIPromiseInfo>(&it->second)) {
    if (jsiPtr->jsInvoker) {
      jsiPtr->jsInvoker->invokeAsync(
          [promise = jsiPtr->promise, error]() { promise->reject(error); });
    } else {
      jsiPtr->promise->reject(error);
    }
  } else if (auto cppPtr = std::get_if<CPPPromiseInfo>(&it->second)) {
    cppPtr->promise.set_exception(
        std::make_exception_ptr(std::runtime_error(error)));
  }
  removePromise(id);
}

} // namespace comm
