#pragma once

#include <cstdint>
#include <string>

namespace comm {
namespace network {

uint64_t getCurrentTimestamp();

bool hasEnvFlag(const std::string &flag);

std::string decorateTableName(const std::string &baseName);

bool isDevMode();

} // namespace network
} // namespace comm
