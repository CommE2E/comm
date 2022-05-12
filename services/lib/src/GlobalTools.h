#pragma once

#include <cstdint>
#include <string>

namespace comm {
namespace network {

const std::string ID_SEPARATOR = ":";

uint64_t getCurrentTimestamp();

bool hasEnvFlag(const std::string &flag);

std::string decorateTableName(const std::string &baseName);

bool isDevMode();

std::string generateUUID();

} // namespace network
} // namespace comm
