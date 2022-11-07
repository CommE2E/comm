#pragma once

#include "../../Tools/WorkerThread.h"

#include <atomic>

namespace comm {
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

  void enableMultithreadingCommonImpl() {
    if (this->databaseThread == nullptr) {
      this->databaseThread = std::make_unique<WorkerThread>("database");
      this->multithreadingEnabled.store(true);
    }
  }

public:
  static GlobalDBSingleton instance;
  void scheduleOrRun(const taskType task);
  void enableMultithreading();
  void setTasksCancelled(bool tasksCancelled) {
    this->tasksCancelled.store(tasksCancelled);
  }
};
} // namespace comm
