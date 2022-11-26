#include "Tools.h"

#include "Constants.h"
#include "DatabaseEntitiesTools.h"
#include "DatabaseManager.h"
#include "GlobalConstants.h"
#include "S3Tools.h"

#include <openssl/sha.h>

#include <chrono>
#include <cstdlib>
#include <iomanip>
#include <string>

namespace comm {
namespace network {
namespace tools {

database::S3Path
generateS3Path(const std::string &bucketName, const std::string &blobHash) {
  return database::S3Path(bucketName, blobHash);
}

std::string computeHashForFile(const database::S3Path &s3Path) {
  SHA512_CTX ctx;
  SHA512_Init(&ctx);
  const std::function<void(const std::string &)> callback =
      [&ctx](const std::string &chunk) {
        SHA512_Update(&ctx, chunk.data(), chunk.size());
      };

  getBucket(s3Path.getBucketName())
      .getObjectDataChunks(
          s3Path.getObjectName(), callback, GRPC_CHUNK_SIZE_LIMIT);

  unsigned char hash[SHA512_DIGEST_LENGTH];
  SHA512_Final(hash, &ctx);

  std::ostringstream hashStream;
  for (int i = 0; i < SHA512_DIGEST_LENGTH; i++) {
    hashStream << std::hex << std::setfill('0') << std::setw(2)
               << std::nouppercase << (int)hash[i];
  }

  return hashStream.str();
}

database::S3Path findS3Path(const std::string &holder) {
  std::shared_ptr<database::ReverseIndexItem> reverseIndexItem =
      database::DatabaseManager::getInstance().findReverseIndexItemByHolder(
          holder);
  if (reverseIndexItem == nullptr) {
    throw std::runtime_error(
        "provided holder: [" + holder + "] has not been found in the database");
  }
  return findS3Path(*reverseIndexItem);
}

database::S3Path
findS3Path(const database::ReverseIndexItem &reverseIndexItem) {
  std::shared_ptr<database::BlobItem> blobItem =
      database::DatabaseManager::getInstance().findBlobItem(
          reverseIndexItem.getBlobHash());
  if (blobItem == nullptr) {
    throw std::runtime_error(
        "no blob found for blobHash: [" + reverseIndexItem.getBlobHash() + "]");
  }
  database::S3Path result = blobItem->getS3Path();
  return result;
}

} // namespace tools
} // namespace network
} // namespace comm
