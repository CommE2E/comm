#import "RustNetworkingSingleton.h"
#import <Foundation/Foundation.h>
#include <ReactCommon/TurboModuleUtils.h>

namespace comm {
RustNetworkingSingleton RustNetworkingSingleton::instance;

RustNetworkingSingleton::RustNetworkingSingleton()
    : multithreadingEnabled(false), rustNetworkingThread(nullptr) {
}

void RustNetworkingSingleton::schedule(const taskType task) {
  if (NSThread.isMainThread || this->multithreadingEnabled.load()) {
    this->scheduleCommonImpl(task);
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    this->scheduleCommonImpl(task);
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

uint32_t RustNetworkingSingleton::addPromise(
    std::shared_ptr<Promise> promise,
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker) {
  return addPromiseCommonImpl(promise, jsInvoker);
}

void RustNetworkingSingleton::removePromise(uint32_t id) {
  removePromiseCommonImpl(id);
}

void RustNetworkingSingleton::resolvePromise(uint32_t id, double ret) {
  resolvePromiseCommonImpl(id, ret);
}

void RustNetworkingSingleton::rejectPromise(
    uint32_t id,
    const std::string &error) {
  rejectPromiseCommonImpl(id, error);
}

} // namespace comm
