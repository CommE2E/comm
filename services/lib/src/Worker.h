#pragma once

#include <thread>
#include <mutex>
#include <vector>
#include <atomic>
#include <memory>

typedef std::function<void()> Task;
typedef std::function<void(std::unique_ptr<std::string>)> Callback;

class Worker {
  std::vector<std::thread> threads;
  std::mutex threadsMutex;
  std::atomic<size_t> currentId = 0;

  Worker() {}

  virtual ~Worker() {
    const std::lock_guard<std::mutex> lock(this->threadsMutex);
    for (auto &thread : this-> threads) {
      thread.join();
    }
  }
public:

  static Worker &getInstance() {
    static Worker instance;
    return instance;
  }

  void schedule(Task task, Callback callback) {
    size_t id = this->currentId++;
    std::thread t([](size_t id, Task task, Callback callback) {
      std::unique_ptr<std::string> err = nullptr;
      try {
        task();
      } catch (std::exception &e) {
        err = std::make_unique<std::string>(e.what());
      }
      callback(std::move(err));
    }, id, std::move(task), std::move(callback));
    const std::lock_guard<std::mutex> lock(this->threadsMutex);
    this->threads.push_back(std::move(t));
  }
};
