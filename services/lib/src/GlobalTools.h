#pragma once

#include <cstdint>
#include <string>

namespace comm {
namespace network {
namespace tools {

const std::string ID_SEPARATOR = ":";

uint64_t getCurrentTimestamp();

bool hasEnvFlag(const std::string &flag);

size_t getNumberOfCores();

std::string decorateTableName(const std::string &baseName);

bool isSandbox();

std::string generateUUID();

bool validateUUIDv4(const std::string &uuid);

void InitLogging(const std::string &programName);

} // namespace tools
} // namespace network
} // namespace comm
