#import "GlobalDBSingleton.h"
#import <Foundation/Foundation.h>
#include <ReactCommon/TurboModuleUtils.h>

namespace comm {
GlobalDBSingleton GlobalDBSingleton::instance;

GlobalDBSingleton::GlobalDBSingleton()
    : multithreadingEnabled(false),
      databaseThread(nullptr),
      tasksCancelled(false) {
}

void GlobalDBSingleton::scheduleOrRun(const taskType task) {
  if (NSThread.isMainThread || this->multithreadingEnabled.load()) {
    this->scheduleOrRunCommonImpl(task);
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    this->scheduleOrRunCommonImpl(task);
  });
}

void GlobalDBSingleton::scheduleOrRunCancellable(const taskType task) {
  if (NSThread.isMainThread || this->multithreadingEnabled.load()) {
    this->scheduleOrRunCancellableCommonImpl(task);
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    this->scheduleOrRunCancellableCommonImpl(task);
  });
}

void GlobalDBSingleton::scheduleOrRunCancellable(
    const taskType task,
    const std::shared_ptr<facebook::react::Promise> promise,
    const std::shared_ptr<facebook::react::CallInvoker> jsInvoker) {
  if (NSThread.isMainThread || this->multithreadingEnabled.load()) {
    this->scheduleOrRunCancellableCommonImpl(task, promise, jsInvoker);
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    this->scheduleOrRunCancellableCommonImpl(task, promise, jsInvoker);
  });
}

void GlobalDBSingleton::enableMultithreading() {
  if (NSThread.isMainThread) {
    this->enableMultithreadingCommonImpl();
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    this->enableMultithreadingCommonImpl();
  });
}
} // namespace comm
