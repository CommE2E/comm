#import "RustNetworkingSingleton.h"
#import <Foundation/Foundation.h>
#include <ReactCommon/TurboModuleUtils.h>

namespace comm {
RustNetworkingSingleton RustNetworkingSingleton::instance;

RustNetworkingSingleton::RustNetworkingSingleton()
    : multithreadingEnabled(false), rustNetworkingThread(nullptr) {
}

void RustNetworkingSingleton::scheduleOrRun(const taskType task) {
  if (NSThread.isMainThread || this->multithreadingEnabled.load()) {
    this->scheduleOrRunCommonImpl(task);
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    this->scheduleOrRunCommonImpl(task);
  });
}

void RustNetworkingSingleton::enableMultithreading() {
  if (NSThread.isMainThread) {
    this->enableMultithreadingCommonImpl();
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    this->enableMultithreadingCommonImpl();
  });
}

uint32_t RustNetworkingSingleton::getNextID() {
  return this->id++;
}

uint32_t RustNetworkingSingleton::addPromise(
    std::shared_ptr<Promise> promise,
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker) {
  uint32_t id = getNextID();
  std::shared_ptr<PromiseInfo> info = std::make_shared<PromiseInfo>();
  info->promise = promise;
  info->jsInvoker = jsInvoker;
  promises.insert({id, info});
  return id;
}
void RustNetworkingSingleton::removePromise(uint32_t id) {
  promises.erase(id);
}

void RustNetworkingSingleton::resolvePromise(
    uint32_t id,
    facebook::jsi::Value value) {
  auto it = promises.find(id);
  if (it != promises.end()) {
    if (it->second->jsInvoker) {
      it->second->jsInvoker->invokeAsync(
          [promise = std::ref(*(it->second->promise)), value]() {
            promise.get().resolve(value);
          });
    } else {
      it->second->promise->resolve(value);
    }
    removePromise(id);
  }
}
void RustNetworkingSingleton::rejectPromise(
    uint32_t id,
    const std::string &error) {
  auto it = promises.find(id);
  if (it != promises.end()) {
    if (it->second->jsInvoker) {
      it->second->jsInvoker->invokeAsync(
          [promise = it->second->promise, error]() { promise->reject(error); });
    } else {
      it->second->promise->reject(error);
    }
    removePromise(id);
  }
}

} // namespace comm
