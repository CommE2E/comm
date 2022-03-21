#include "DevTools.h"

namespace comm {
namespace network {

std::string createCommPath(const std::string &path) {
  if (path.substr(0, commFilesystemPath.size()) == commFilesystemPath) {
    return path;
  }
  return commFilesystemPath + "/" + path;
}

} // namespace network
} // namespace comm
