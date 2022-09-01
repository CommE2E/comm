#include "Tools.h"

#include "GlobalConstants.h"
#include "GlobalTools.h"

#include <chrono>
#include <cstdlib>
#include <random>
#include <sstream>
#include <stdexcept>

namespace comm {
namespace network {
namespace tools {

std::string generateRandomString(std::size_t length) {
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
  return backupID + ID_SEPARATOR + resourceID + ID_SEPARATOR + blobHash +
      ID_SEPARATOR + tools::generateUUID();
}

std::string validateAttachmentHolders(const std::string &holders) {
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

int charPtrToInt(const char *str) {
  unsigned int intValue;
  std::stringstream strValue;

  strValue << str;
  strValue >> intValue;

  return intValue;
}

size_t getBlobPutField(BlobPutField field) {
  return static_cast<size_t>(field);
}

} // namespace tools
} // namespace network
} // namespace comm
