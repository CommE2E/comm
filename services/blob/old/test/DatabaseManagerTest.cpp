#include <gtest/gtest.h>

#include "DatabaseManager.h"
#include "S3Path.h"

#include <algorithm>
#include <chrono>
#include <memory>
#include <string>
#include <vector>

using namespace comm::network::database;

class DatabaseManagerTest : public testing::Test {
protected:
  virtual void SetUp() {
    Aws::InitAPI({});
  }

  virtual void TearDown() {
    Aws::ShutdownAPI({});
  }
};

std::string generateName() {
  std::chrono::milliseconds ms =
      std::chrono::duration_cast<std::chrono::milliseconds>(
          std::chrono::system_clock::now().time_since_epoch());
  return std::to_string(ms.count());
}

TEST_F(DatabaseManagerTest, TestOperationsOnBlobItems) {
  const BlobItem item(generateName(), S3Path(generateName(), generateName()));

  DatabaseManager::getInstance().putBlobItem(item);
  std::shared_ptr<BlobItem> foundItem =
      DatabaseManager::getInstance().findBlobItem(item.getBlobHash());
  EXPECT_NE(foundItem->getCreated(), 0);
  EXPECT_EQ(item.getBlobHash(), foundItem->getBlobHash());
  const BlobItem item2(generateName(), S3Path(generateName(), generateName()));
  DatabaseManager::getInstance().putBlobItem(item2);
  DatabaseManager::getInstance().removeBlobItem(item.getBlobHash());
  DatabaseManager::getInstance().removeBlobItem(item2.getBlobHash());
  EXPECT_EQ(
      DatabaseManager::getInstance().findBlobItem(item.getBlobHash()), nullptr);
  EXPECT_EQ(
      DatabaseManager::getInstance().findBlobItem(item2.getBlobHash()),
      nullptr);
}

TEST_F(DatabaseManagerTest, TestOperationsOnReverseIndexItems) {
  const ReverseIndexItem item(generateName(), generateName());

  DatabaseManager::getInstance().putReverseIndexItem(item);
  std::vector<std::shared_ptr<ReverseIndexItem>> foundItems =
      DatabaseManager::getInstance().findReverseIndexItemsByHash(
          item.getBlobHash());
  EXPECT_EQ(foundItems.size(), 1);
  std::shared_ptr<ReverseIndexItem> foundItem = foundItems.at(0);
  EXPECT_EQ(item.getBlobHash(), foundItem->getBlobHash());
  foundItem = std::dynamic_pointer_cast<ReverseIndexItem>(
      DatabaseManager::getInstance().findReverseIndexItemByHolder(
          item.getHolder()));
  EXPECT_EQ(item.getBlobHash(), foundItem->getBlobHash());
  DatabaseManager::getInstance().removeReverseIndexItem(foundItem->getHolder());
}
