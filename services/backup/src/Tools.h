#pragma once

#include <cstdint>
#include <string>

namespace comm {
namespace network {

std::string generateRandomString(std::size_t length = 20);
uint64_t getCurrentTimestamp();
std::string decorateTableName(const std::string &baseName);
bool isDevMode();

} // namespace network
} // namespace comm
