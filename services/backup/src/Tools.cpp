#include "Tools.h"

#include <chrono>
#include <cstdlib>
#include <random>

namespace comm {
namespace network {

std::string generateRandomString(std::size_t length) {
  const std::string CHARACTERS =
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  thread_local std::random_device generator;
  std::uniform_int_distribution<> distribution(0, CHARACTERS.size() - 1);
  std::string random_string;
  for (std::size_t i = 0; i < length; ++i) {
    random_string += CHARACTERS[distribution(generator)];
  }
  return random_string;
}

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
