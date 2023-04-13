#include "Tools.h"
#include "ConfigManager.h"
#include "Constants.h"

#include <glog/logging.h>

#include <chrono>
#include <random>
#include <regex>

namespace comm {
namespace network {
namespace tools {

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

bool validateDeviceID(std::string deviceID) {
  if (config::ConfigManager::getInstance().isParameterSet(
          config::ConfigManager::OPTION_DISABLE_DEVICEID_VALIDATION)) {
    return true;
  }
  try {
    static const std::regex deviceIDKeyserverRegexp("^ks:.*");
    if (std::regex_match(deviceID, deviceIDKeyserverRegexp)) {
      return (
          deviceID ==
          config::ConfigManager::getInstance().getParameter(
              config::ConfigManager::OPTION_DEFAULT_KEYSERVER_ID));
    }
    return std::regex_match(deviceID, DEVICEID_FORMAT_REGEX);
  } catch (const std::exception &e) {
    LOG(ERROR) << "Tools: "
               << "Got an exception at `validateDeviceID`: " << e.what();
    return false;
  }
}

bool validateSessionID(std::string sessionID) {
  try {
    return std::regex_match(sessionID, SESSION_ID_FORMAT_REGEX);
  } catch (const std::exception &e) {
    LOG(ERROR) << "Tools: "
               << "Got an exception at `validateSessionId`: " << e.what();
    return false;
  }
}

void checkIfNotEmpty(std::string fieldName, std::string stringToCheck) {
  if (stringToCheck.empty()) {
    throw std::runtime_error(
        "Error: Required text field " + fieldName + " is empty.");
  }
}

void checkIfNotZero(std::string fieldName, uint64_t numberToCheck) {
  if (numberToCheck == 0) {
    throw std::runtime_error(
        "Error: Required number " + fieldName + " is zero.");
  }
}

} // namespace tools
} // namespace network
} // namespace comm
