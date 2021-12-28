#include "Tools.h"

#include "AwsStorageManager.h"
#include "DatabaseEntitiesTools.h"
#include "DatabaseManager.h"

#include <openssl/sha.h>

#include <chrono>
#include <iomanip>
#include <string>

namespace comm {
namespace network {

database::S3Path Tools::generateS3Path(
    const std::string &bucketName,
    const std::string &blobHash) {
  return database::S3Path(bucketName, blobHash);
}

std::string Tools::computeHashForFile(const database::S3Path &s3Path) {
  SHA512_CTX ctx;
  SHA512_Init(&ctx);
  const std::function<void(const std::string &)> callback =
      [&ctx](const std::string &chunk) {
        SHA512_Update(&ctx, chunk.data(), chunk.size());
      };

  AwsStorageManager::getInstance()
      .getBucket(s3Path.getBucketName())
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

database::S3Path Tools::findS3Path(const std::string &holder) {
  std::shared_ptr<database::ReverseIndexItem> reverseIndexItem =
      database::DatabaseManager::getInstance().findReverseIndexItemByHolder(
          holder);
  if (reverseIndexItem == nullptr) {
    std::string errorMessage = "provided holder: [";
    errorMessage += holder + "] has not been found in the database";
    throw std::runtime_error(errorMessage);
  }
  return Tools::getInstance().findS3Path(*reverseIndexItem);
}

database::S3Path
Tools::findS3Path(const database::ReverseIndexItem &reverseIndexItem) {
  std::shared_ptr<database::BlobItem> blobItem =
      database::DatabaseManager::getInstance().findBlobItem(
          reverseIndexItem.getBlobHash());
  if (blobItem == nullptr) {
    std::string errorMessage = "no blob found for blobHash: [";
    errorMessage += reverseIndexItem.getBlobHash() + "]";
    throw std::runtime_error(errorMessage);
  }
  database::S3Path result = blobItem->getS3Path();
  return result;
}

long long Tools::getCurrentTimestamp() {
  using namespace std::chrono;
  return duration_cast<milliseconds>(system_clock::now().time_since_epoch())
      .count();
}

} // namespace network
} // namespace comm
