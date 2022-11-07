#import "GlobalDBSingleton.h"
#import <Foundation/Foundation.h>

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
