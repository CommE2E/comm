#include "GlobalTools.h"

#include <glog/logging.h>
#include <openssl/sha.h>
#include <boost/uuid/uuid.hpp>
#include <boost/uuid/uuid_generators.hpp>
#include <boost/uuid/uuid_io.hpp>

#include <chrono>
#include <iomanip>
#include <regex>
#include <string>
#include <thread>
#include <algorithm>

namespace comm {
namespace network {
namespace tools {

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

size_t getNumberOfCores() {
  return (size_t)std::max(1u, std::thread::hardware_concurrency());
}

std::string decorateTableName(const std::string &baseName) {
  std::string suffix = "";
  if (hasEnvFlag("COMM_TEST_SERVICES")) {
    suffix = "-test";
  }
  return baseName + suffix;
}

bool isSandbox() {
  return hasEnvFlag("COMM_SERVICES_SANDBOX");
}

std::string generateUUID() {
  thread_local boost::uuids::random_generator random_generator;
  return boost::uuids::to_string(random_generator());
}

bool validateUUIDv4(const std::string &uuid) {
  const std::regex uuidV4RegexFormat(
      "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$");
  try {
    return std::regex_match(uuid, uuidV4RegexFormat);
  } catch (const std::exception &e) {
    LOG(ERROR) << "Tools: "
               << "Got an exception at `validateUUID`: " << e.what();
    return false;
  }
}

void InitLogging(const std::string &programName) {
  FLAGS_logtostderr = true;
  FLAGS_colorlogtostderr = true;
  if (comm::network::tools::isSandbox()) {
    // Log levels INFO, WARNING, ERROR, FATAL are 0, 1, 2, 3, respectively
    FLAGS_minloglevel = 0;
  } else {
    FLAGS_minloglevel = 1;
  }
  google::InitGoogleLogging(programName.c_str());
}

} // namespace tools
} // namespace network
} // namespace comm
