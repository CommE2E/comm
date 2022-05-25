#pragma once

#include <cstdint>
#include <string>

namespace comm {
namespace network {
namespace tools {

const std::string ID_SEPARATOR = ":";

uint64_t getCurrentTimestamp();

bool hasEnvFlag(const std::string &flag);

std::string decorateTableName(const std::string &baseName);

bool isDevMode();

std::string generateUUID();

} // namespace tools
} // namespace network
} // namespace comm
