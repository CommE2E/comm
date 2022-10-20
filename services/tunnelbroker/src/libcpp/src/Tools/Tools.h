#pragma once

#include <random>
#include <string>

namespace comm {
namespace network {
namespace tools {

std::string generateRandomString(std::size_t length);
bool validateDeviceID(std::string deviceID);
bool validateSessionID(std::string sessionID);
void checkIfNotEmpty(std::string fieldName, std::string stringToCheck);
void checkIfNotZero(std::string fieldName, uint64_t numberToCheck);

} // namespace tools
} // namespace network
} // namespace comm
