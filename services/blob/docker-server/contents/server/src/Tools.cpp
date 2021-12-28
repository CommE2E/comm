#include "Tools.h"

#include "DatabaseEntitiesTools.h"

#include <chrono>

namespace comm {
namespace network {

database::S3Path Tools::generateS3Path(
    const std::string &bucketName,
    const std::string &blobHash) {
  return database::S3Path(bucketName, blobHash);
}

std::string Tools::computeHashForFile(const database::S3Path &s3Path) {
  return database::BlobItem::FIELD_FILE_HASH; // TODO
}

long long Tools::getCurrentTimestamp() {
  using namespace std::chrono;
  return duration_cast<milliseconds>(system_clock::now().time_since_epoch())
      .count();
}

} // namespace network
} // namespace comm
