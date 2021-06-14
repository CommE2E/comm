#pragma once

#include <folly/MPMCQueue.h>
#include <memory>
#include <thread>

namespace comm {

using taskType = std::function<void()>;

class WorkerThread {
  std::unique_ptr<std::thread> thread;
  folly::MPMCQueue<std::unique_ptr<taskType>> tasks;

public:
  WorkerThread();
  void scheduleTask(const taskType task);
  ~WorkerThread();
};

} // namespace comm
