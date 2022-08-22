#pragma once

#include <folly/MPMCQueue.h>
#include <future>
#include <memory>
#include <string>
#include <thread>

namespace comm {

using taskType = std::function<void()>;

class WorkerThread {
  std::unique_ptr<std::thread> thread;
  folly::MPMCQueue<std::unique_ptr<taskType>> tasks;
  const std::string name;

public:
  WorkerThread(const std::string name);
  void scheduleTask(const taskType task);
  std::shared_ptr<std::promise<void>> flushAndBlock();
  ~WorkerThread();
};

} // namespace comm
