#pragma once

#include <cstdint>
#include <string>

namespace comm {
namespace network {

std::string generateRandomString(std::size_t length = 20);
uint64_t getCurrentTimestamp();

} // namespace network
} // namespace comm
