#pragma once

#include "DatabaseManager.h"

namespace comm {
namespace network {

class Cleanup {
  const std::string bucketName;

public:
  Cleanup(const std::string &bucketName);

  void perform();
  void perform(const std::string &fileHash);
};

} // namespace network
} // namespace comm
