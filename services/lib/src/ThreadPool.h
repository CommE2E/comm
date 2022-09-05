#pragma once

#include "GlobalTools.h"

#include <boost/asio.hpp>
#include <boost/asio/thread_pool.hpp>

#include <atomic>
#include <memory>

typedef std::function<void()> Task;
typedef std::function<void(std::unique_ptr<std::string>)> Callback;

namespace comm {
namespace network {

class ThreadPool {
  boost::asio::thread_pool pool =
      boost::asio::thread_pool(tools::getNumberOfCores());

  ThreadPool() {
  }

  virtual ~ThreadPool() {
  }

public:
  static ThreadPool &getInstance() {
    static ThreadPool instance;
    return instance;
  }

  void scheduleWithCallback(Task task, Callback callback) {
    boost::asio::post(this->pool, [task, callback]() {
      std::unique_ptr<std::string> err = nullptr;
      try {
        task();
      } catch (std::exception &e) {
        err = std::make_unique<std::string>(e.what());
      }
      callback(std::move(err));
    });
  }
};

} // namespace network
} // namespace comm
