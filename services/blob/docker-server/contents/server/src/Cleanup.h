#pragma once

#include "DatabaseManager.h"

#include <memory>
#include <thread>

namespace comm {
namespace network {

class Cleanup {
  const size_t cleanupSecondsInterval = 5;
  size_t threadCounter = 0;
  std::unique_ptr<std::thread> thread;

  const std::string bucketName;

public:
  Cleanup(const std::string &bucketName);

  void perform();
  void perform(const std::string &fileHash);
};

} // namespace network
} // namespace comm
