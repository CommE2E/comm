#pragma once

#include <string>

namespace comm {
namespace network {

std::string generateRandomString(std::size_t length = 20);

std::string generateHolder(
    const std::string &blobHash,
    const std::string &backupID,
    const std::string &resourceID = "");

} // namespace network
} // namespace comm
