#pragma once

//#include <folly/MPMCQueue.h>
#include <memory>
#include <string>
#include <thread>
#include "mpmcqueue.h"

namespace comm {

using taskType = std::function<void()>;

class WorkerThread {
  std::unique_ptr<std::thread> thread;
  mpmcqueue<std::unique_ptr<taskType>> tasks;
  const std::string name;

public:
  WorkerThread(const std::string name);
  void scheduleTask(const taskType task);
  ~WorkerThread();
};

} // namespace comm
