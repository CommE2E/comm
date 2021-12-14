#include "Cleanup.h"
#include "AwsObjectsFactory.h"
#include "AwsStorageManager.h"
#include "DatabaseEntities.h"
#include "Tools.h"

#include <chrono>
#include <iostream>
#include <string>
#include <vector>

namespace comm {
namespace network {

Cleanup::Cleanup(const std::string &bucketName) : bucketName(bucketName) {
  auto job = [this]() {
    while (true) {
      std::cout << "[cleanup thread] count: " << this->threadCounter
                << std::endl;
      if (++this->threadCounter >= 10) {
        // todo clear the queue?
        // todo perform cleanup for all hashes
        std::cout << "[cleanup thread] reset counter" << std::endl;
        this->threadCounter = 0;
      }
      std::this_thread::sleep_for(std::chrono::seconds(cleanupSecondsInterval));
    }
  };
  this->thread = std::make_unique<std::thread>(job);
}

void Cleanup::perform() {
  std::vector<std::string> fileHashes =
      database::DatabaseManager::getInstance().getAllHashes();
  for (auto &fileHash : fileHashes) {
    this->perform(fileHash);
  }
}

/*
- if there's no fileHash provided then get a list of all file fileHashes and do
the following for each of them:
  - check if there are any reverse indexes for this fileHash
    - there are
      - set `remove candidate` for this file to `false`
    - there are not
      - if `remove candidate` is `false`
        - set `remove candidate` for this file to `true`
        - schedule cleanup for this fileHash after some timeout
      - if `remove candidate` is `true`
        - remove this file from the S3
        - remove the entry from the `blob` table for this fileHash
*/
void Cleanup::perform(const std::string &fileHash) {
  std::cout << "performing cleanup for fileHash " << fileHash << std::endl;
  std::vector<std::shared_ptr<database::ReverseIndexItem>> reverseIndexItems =
      database::DatabaseManager::getInstance().findReverseIndexItemsByHash(
          fileHash);
  if (reverseIndexItems.size()) {
    std::cout << " - reverse items found - updating remove candidate to 0 and "
                 "aborting"
              << std::endl;
    database::DatabaseManager::getInstance().updateBlobItem(
        fileHash, "removeCandidate", "0");
    return;
  }
  std::cout << " - no reverse items found - continue" << std::endl;
  std::shared_ptr<database::BlobItem> blobItem =
      std::dynamic_pointer_cast<database::BlobItem>(
          database::DatabaseManager::getInstance().findBlobItem(fileHash));
  if (blobItem == nullptr) {
    throw std::runtime_error(
        std::string("no blob item found for fileHash: " +
                    fileHash)); // todo replace all strings in errors like this
  }
  std::cout << " - blob item found " << blobItem->removeCandidate << std::endl;
  if (blobItem->removeCandidate) {
    AwsStorageManager::getInstance()
        .getBucket(this->bucketName)
        .removeObject(blobItem->s3Path.getObjectName());
    database::DatabaseManager::getInstance().removeBlobItem(blobItem->fileHash);
    return;
  }
  database::DatabaseManager::getInstance().updateBlobItem(
      blobItem->fileHash, "removeCandidate", "1");
  // todo schedule cleanup for this file
  std::cout << "scheduling cleanup for file " << blobItem->fileHash
            << std::endl;
}

} // namespace network
} // namespace comm
