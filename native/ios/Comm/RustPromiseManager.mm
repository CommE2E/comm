#import "RustPromiseManager.h"

namespace comm {
RustPromiseManager RustPromiseManager::instance;

RustPromiseManager::RustPromiseManager(){};

uint32_t RustPromiseManager::addPromise(
    std::shared_ptr<Promise> promise,
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker,
    facebook::jsi::Runtime &rt) {
  return addPromiseCommonImpl(promise, jsInvoker, rt);
}

void RustPromiseManager::removePromise(uint32_t id) {
  removePromiseCommonImpl(id);
}

void RustPromiseManager::resolvePromise(uint32_t id, folly::dynamic ret) {
  resolvePromiseCommonImpl(id, ret);
}

void RustPromiseManager::rejectPromise(uint32_t id, const std::string &error) {
  rejectPromiseCommonImpl(id, error);
}

} // namespace comm
