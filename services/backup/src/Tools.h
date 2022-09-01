#pragma once

#include <string>

namespace comm {
namespace network {
namespace tools {

enum class BlobPutField {
  HOLDER = 0,
  HASH = 1,
  DATA_CHUNK = 2,
};

std::string generateRandomString(std::size_t length = 20);

std::string generateHolder(
    const std::string &blobHash,
    const std::string &backupID,
    const std::string &resourceID = "");

std::string validateAttachmentHolders(const std::string &holders);

int charPtrToInt(const char *str);

size_t getBlobPutField(BlobPutField field);

} // namespace tools
} // namespace network
} // namespace comm
