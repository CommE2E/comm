#pragma once

#include "../../Tools/WorkerThread.h"
#include <ReactCommon/TurboModuleUtils.h>

#include <atomic>

namespace comm {

const std::string TASK_CANCELLED_FLAG{"TASK_CANCELLED"};

class GlobalDBSingleton {
  std::atomic<bool> multithreadingEnabled;
  std::unique_ptr<WorkerThread> databaseThread;
  std::atomic<bool> tasksCancelled;

  GlobalDBSingleton();

  void scheduleOrRunCommonImpl(const taskType task) {
    if (this->databaseThread != nullptr) {
      this->databaseThread->scheduleTask(task);
      return;
    }
    task();
  }

  void scheduleOrRunCancellableCommonImpl(const taskType task) {
    if (this->tasksCancelled.load()) {
      throw std::runtime_error(TASK_CANCELLED_FLAG);
    }

    this->scheduleOrRunCommonImpl([this, task]() {
      if (this->tasksCancelled.load()) {
        throw std::runtime_error(TASK_CANCELLED_FLAG);
      }
      task();
    });
  }

  void scheduleOrRunCancellableCommonImpl(
      const taskType task,
      const std::shared_ptr<facebook::react::Promise> promise,
      const std::shared_ptr<facebook::react::CallInvoker> jsInvoker) {
    if (this->tasksCancelled.load()) {
      jsInvoker->invokeAsync(
          [promise]() { promise->reject(TASK_CANCELLED_FLAG); });
      return;
    }

    scheduleOrRunCommonImpl([this, task, promise, jsInvoker]() {
      if (this->tasksCancelled.load()) {
        jsInvoker->invokeAsync(
            [promise]() { promise->reject(TASK_CANCELLED_FLAG); });
        return;
      }
      task();
    });
  }

  void enableMultithreadingCommonImpl() {
    if (this->databaseThread == nullptr) {
      this->databaseThread = std::make_unique<WorkerThread>("database");
      this->multithreadingEnabled.store(true);
    }
  }

public:
  static GlobalDBSingleton instance;
  void scheduleOrRun(const taskType task);
  void scheduleOrRunCancellable(const taskType task);
  void scheduleOrRunCancellable(
      const taskType task,
      const std::shared_ptr<facebook::react::Promise> promise,
      const std::shared_ptr<facebook::react::CallInvoker> jsInvoker);
  void enableMultithreading();
  void setTasksCancelled(bool tasksCancelled) {
    this->tasksCancelled.store(tasksCancelled);
  }
};
} // namespace comm
