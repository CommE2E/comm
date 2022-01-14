#pragma once

#include <string>

namespace comm {
namespace network {

const std::string commFilesystemPath = "/tmp/comm";

std::string createCommPath(const std::string &path);

} // namespace network
} // namespace comm
