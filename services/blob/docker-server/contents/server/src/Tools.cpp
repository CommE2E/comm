#include "Tools.h"

namespace comm {
namespace network {

database::S3Path Tools::generateS3Path(const std::string &bucketName,
                                       const std::string &fileHash) {
  // todo this may change
  return database::S3Path(bucketName, fileHash);
}

std::string Tools::computeHashForFile(const database::S3Path &s3Path) {
  return "fileHash"; // TODO
}

database::S3Path Tools::findS3Path(const std::string &reverseIndex) {
  std::shared_ptr<database::ReverseIndexItem> reverseIndexItem =
      std::dynamic_pointer_cast<database::ReverseIndexItem>(
          database::DatabaseManager::getInstance()
              .findReverseIndexItemByReverseIndex(reverseIndex));
  if (reverseIndexItem == nullptr) {
    std::string errorMessage = "provided reverse index: [";
    errorMessage += reverseIndex + "] has not been found in the database";
    throw std::runtime_error(errorMessage);
  }
  std::shared_ptr<database::BlobItem> blobItem =
      std::dynamic_pointer_cast<database::BlobItem>(
          database::DatabaseManager::getInstance().findBlobItem(
              reverseIndexItem->fileHash));
  if (blobItem == nullptr) {
    std::string errorMessage = "no blob found for fileHash: [";
    errorMessage += reverseIndexItem->fileHash + "]";
    throw std::runtime_error(errorMessage);
  }
  database::S3Path result = blobItem->s3Path;
  return result;
}

} // namespace network
} // namespace comm
