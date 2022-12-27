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
} // namespace comm
