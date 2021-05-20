#pragma once

#include <folly/MPMCQueue.h>
#include <memory>
#include <thread>

namespace comm {

using taskType = std::function<void()>;

class DatabaseThread {
  std::unique_ptr<std::thread> thread;
  folly::MPMCQueue<std::unique_ptr<taskType>> tasks;

public:
  DatabaseThread();
  void scheduleTask(const taskType task);
  ~DatabaseThread();
};

} // namespace comm
