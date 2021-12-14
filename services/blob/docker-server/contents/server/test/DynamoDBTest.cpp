#include <gtest/gtest.h>

#include "DatabaseManager.h"
#include "S3Path.h"

#include <iostream>

#include <algorithm>
#include <memory>
#include <random>
#include <string>
#include <vector>

using namespace comm::network::database;

class DatabaseManagerTest : public testing::Test {
protected:
  virtual void SetUp() { Aws::InitAPI({}); }

  virtual void TearDown() { Aws::ShutdownAPI({}); }

  int randomNumber(const int from, const int to) {
    std::random_device rd;
    std::mt19937 mt(rd());
    std::uniform_int_distribution<int> dist(from, to);

    return dist(mt);
  }

  std::string randomString(size_t size = 20) {
    std::string str(
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");

    std::string result;

    for (size_t i = 0; i < size; ++i) {
      result += str[randomNumber(0, str.size() - 1)];
    }

    return result;
  }

  BlobItem generateBlobItem() {
    return BlobItem(randomString(), S3Path(randomString(), randomString()));
  }

  ReverseIndexItem generateReverseIndexItem() {
    return ReverseIndexItem(randomString(), randomString());
  }
};

TEST_F(DatabaseManagerTest, TestOperationsOnBlobItems) {
  const BlobItem item = generateBlobItem();

  std::cout << "==> create db manager" << std::endl;
  std::cout << "==> put item" << std::endl;
  DatabaseManager::getInstance().putBlobItem(item);
  std::cout << "==> find item" << std::endl;
  std::shared_ptr<BlobItem> foundItem = std::dynamic_pointer_cast<BlobItem>(
      DatabaseManager::getInstance().findBlobItem(item.fileHash));
  std::cout << "==> checking fileHashes" << std::endl;
  EXPECT_EQ(item.fileHash.size(), foundItem->fileHash.size());
  EXPECT_EQ(memcmp(item.fileHash.data(), foundItem->fileHash.data(),
                   item.fileHash.size()),
            0);
  std::cout << "==> update item" << std::endl;
  const S3Path newS3Path = S3Path(randomString(), randomString());
  DatabaseManager::getInstance().updateBlobItem(
      foundItem->fileHash, "removeCandidate",
      std::to_string(!foundItem->removeCandidate));
  DatabaseManager::getInstance().updateBlobItem(foundItem->fileHash, "s3Path",
                                                newS3Path.getFullPath());
  foundItem = std::dynamic_pointer_cast<BlobItem>(
      DatabaseManager::getInstance().findBlobItem(item.fileHash));
  EXPECT_TRUE(foundItem->removeCandidate != item.removeCandidate);
  EXPECT_TRUE(foundItem->s3Path.getFullPath() == newS3Path.getFullPath());
  std::cout << "==> put another item item" << std::endl;
  const BlobItem item2 = generateBlobItem();
  DatabaseManager::getInstance().putBlobItem(item2);
  std::cout << "==> get all hashes" << std::endl;
  const std::vector<std::string> allHashes =
      DatabaseManager::getInstance().getAllHashes();
  EXPECT_EQ(allHashes.size(), 2);
  EXPECT_TRUE(std::find(allHashes.begin(), allHashes.end(), item.fileHash) !=
              allHashes.end());
  EXPECT_TRUE(std::find(allHashes.begin(), allHashes.end(), item2.fileHash) !=
              allHashes.end());
  std::cout << "==> remove item" << std::endl;
  DatabaseManager::getInstance().removeBlobItem(item.fileHash);
  DatabaseManager::getInstance().removeBlobItem(item2.fileHash);
  std::cout << "==> done" << std::endl;
}

TEST_F(DatabaseManagerTest, TestOperationsOnReverseIndexItems) {
  const ReverseIndexItem item = generateReverseIndexItem();

  std::cout << "==> create db manager" << std::endl;
  std::cout << "==> put item" << std::endl;
  DatabaseManager::getInstance().putReverseIndexItem(item);
  std::cout << "==> find item by fileHash" << std::endl;
  std::vector<std::shared_ptr<ReverseIndexItem>> foundItems =
      DatabaseManager::getInstance().findReverseIndexItemsByHash(item.fileHash);
  EXPECT_EQ(foundItems.size(), 1);
  std::shared_ptr<ReverseIndexItem> foundItem = foundItems.at(0);
  std::cout << "==> checking fileHashes" << std::endl;
  EXPECT_EQ(item.fileHash.size(), foundItem->fileHash.size());
  EXPECT_EQ(memcmp(item.fileHash.data(), foundItem->fileHash.data(),
                   item.fileHash.size()),
            0);
  std::cout << "==> find item by reverse index" << std::endl;
  foundItem = std::dynamic_pointer_cast<ReverseIndexItem>(
      DatabaseManager::getInstance().findReverseIndexItemByReverseIndex(
          item.reverseIndex));
  std::cout << "==> checking fileHashes" << std::endl;
  EXPECT_EQ(item.fileHash.size(), foundItem->fileHash.size());
  EXPECT_EQ(memcmp(item.fileHash.data(), foundItem->fileHash.data(),
                   item.fileHash.size()),
            0);
  std::cout << "==> remove item" << std::endl;
  DatabaseManager::getInstance().removeReverseIndexItem(
      foundItem->reverseIndex);
  std::cout << "==> done" << std::endl;
}
