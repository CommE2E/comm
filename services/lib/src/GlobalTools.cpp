#include "GlobalTools.h"

#include <openssl/sha.h>

#include <chrono>
#include <iomanip>
#include <string>

namespace comm {
namespace network {

uint64_t getCurrentTimestamp() {
  using namespace std::chrono;
  return duration_cast<milliseconds>(system_clock::now().time_since_epoch())
      .count();
}

std::string decorateTableName(const std::string &baseName) {
  std::string suffix = "";
  if (std::getenv("COMM_TEST_SERVICES") != nullptr &&
      std::string(std::getenv("COMM_TEST_SERVICES")) == "1") {
    suffix = "-test";
  }
  return baseName + suffix;
}

bool isDevMode() {
  if (std::getenv("COMM_SERVICES_DEV_MODE") == nullptr) {
    return false;
  }
  return std::string(std::getenv("COMM_SERVICES_DEV_MODE")) == "1";
}

} // namespace network
} // namespace comm
