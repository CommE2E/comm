#include "DatabaseManager.h"
#include "Tools.h"

#include <iostream>
#include <string>

namespace comm {
namespace network {
namespace database {

DatabaseManager &DatabaseManager::getInstance() {
  static DatabaseManager instance;
  return instance;
}

void DatabaseManager::putBlobItem(const BlobItem &item) {
  std::shared_ptr<BlobItem> blobItem = std::make_shared<BlobItem>(
      item.getBlobHash(), item.getS3Path(), getCurrentTimestamp());
  this->dbSimulator.blob.insert(item.getBlobHash(), std::move(blobItem));
}

std::shared_ptr<BlobItem>
DatabaseManager::findBlobItem(const std::string &blobHash) {
  if (this->dbSimulator.blob.find(blobHash) == this->dbSimulator.blob.end()) {
    return nullptr;
  }
  return this->dbSimulator.blob.at(blobHash);
}

void DatabaseManager::removeBlobItem(const std::string &blobHash) {
  this->dbSimulator.blob.erase(blobHash);
}

void DatabaseManager::putReverseIndexItem(const ReverseIndexItem &item) {
  this->dbSimulator.reverseIndex.insert(
      item.getHolder(),
      std::move(std::make_shared<ReverseIndexItem>(
          item.getHolder(), item.getBlobHash())));
}

std::shared_ptr<ReverseIndexItem>
DatabaseManager::findReverseIndexItemByHolder(const std::string &holder) {
  if (this->dbSimulator.reverseIndex.find(holder) ==
      this->dbSimulator.reverseIndex.end()) {
    return nullptr;
  }
  return this->dbSimulator.reverseIndex.at(holder);
}

std::vector<std::shared_ptr<ReverseIndexItem>>
DatabaseManager::findReverseIndexItemsByHash(const std::string &blobHash) {
  std::vector<std::shared_ptr<ReverseIndexItem>> items = {};
  for (auto it = this->dbSimulator.reverseIndex.begin();
       it != this->dbSimulator.reverseIndex.end();
       ++it) {
    if (it->second->getBlobHash() == blobHash) {
      items.push_back(it->second);
    }
  }
  return items;
}

bool DatabaseManager::removeReverseIndexItem(const std::string &holder) {
  return this->dbSimulator.reverseIndex.erase(holder);
}

} // namespace database
} // namespace network
} // namespace comm
