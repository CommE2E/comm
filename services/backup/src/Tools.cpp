#include "Tools.h"

#include "GlobalConstants.h"
#include "GlobalTools.h"

#include <glog/logging.h>

#include <chrono>
#include <cstdlib>
#include <random>
#include <sstream>
#include <stdexcept>

namespace comm {
namespace network {
namespace tools {

std::string generateRandomString(std::size_t length) {
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[generateRandomString] length " << length;
  const std::string CHARACTERS =
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  thread_local std::random_device generator;
  std::uniform_int_distribution<> distribution(0, CHARACTERS.size() - 1);
  std::string random_string;
  for (std::size_t i = 0; i < length; ++i) {
    random_string += CHARACTERS[distribution(generator)];
  }
  return random_string;
}

std::string generateHolder(
    const std::string &blobHash,
    const std::string &backupID,
    const std::string &resourceID) {
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[generateHolder] blob hash " << blobHash;
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[generateHolder] backup id " << backupID;
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[generateHolder] resource id " << resourceID;
  return backupID + ID_SEPARATOR + resourceID + ID_SEPARATOR + blobHash +
      ID_SEPARATOR + tools::generateUUID();
}

std::string validateAttachmentHolders(const std::string &holders) {
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[validateAttachmentHolders] holders " << holders;
  std::stringstream stream(holders);
  std::string item;
  std::string result;

  while (std::getline(stream, item, ATTACHMENT_DELIMITER)) {
    if (item.empty()) {
      throw std::runtime_error("empty holder detected");
    }
    result += item;
    result += ATTACHMENT_DELIMITER;
  }
  if (result.empty()) {
    throw std::runtime_error("parse attachment holders failed");
  }

  return result;
}

} // namespace tools
} // namespace network
} // namespace comm
