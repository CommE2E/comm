#include "GlobalTools.h"

#include <openssl/sha.h>
#include <boost/uuid/uuid.hpp>
#include <boost/uuid/uuid_generators.hpp>
#include <boost/uuid/uuid_io.hpp>

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

bool hasEnvFlag(const std::string &flag) {
  if (std::getenv(flag.c_str()) == nullptr) {
    return false;
  }
  return std::string(std::getenv(flag.c_str())) == "1";
}

std::string decorateTableName(const std::string &baseName) {
  std::string suffix = "";
  if (hasEnvFlag("COMM_TEST_SERVICES")) {
    suffix = "-test";
  }
  return baseName + suffix;
}

bool isDevMode() {
  return hasEnvFlag("COMM_SERVICES_DEV_MODE");
}

std::string generateUUID() {
  thread_local boost::uuids::random_generator random_generator;
  return boost::uuids::to_string(random_generator());
}

} // namespace network
} // namespace comm
