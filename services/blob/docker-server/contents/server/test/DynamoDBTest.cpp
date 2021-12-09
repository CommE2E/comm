#include <gtest/gtest.h>

#include "DatabaseManager.h"

#include <iostream>

#include <memory>
#include <random>
#include <string>

using namespace comm::network;

class DatabaseManagerTest : public testing::Test {
protected:
  std::unique_ptr<DatabaseManager> dbm;

  virtual void SetUp() {
    Aws::InitAPI({});
    if (dbm == nullptr) {
      dbm = std::make_unique<DatabaseManager>("blob-service-blob",
                                              "blob-service-reverse-index");
    }
  }

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
    return BlobItem(randomString(), randomString());
  }

  ReverseIndexItem generateReverseIndexItem() {
    return ReverseIndexItem(randomString(), randomString());
  }
};

TEST_F(DatabaseManagerTest, TestOperationsOnBlobItems) {
  const BlobItem item = generateBlobItem();

  std::cout << "==> create db manager" << std::endl;
  std::cout << "==> put item" << std::endl;
  dbm->putBlobItem(item);
  std::cout << "==> find item" << std::endl;
  std::shared_ptr<BlobItem> foundItem =
      std::dynamic_pointer_cast<BlobItem>(dbm->findBlobItem(item.hash));
  std::cout << "==> checking hashes" << std::endl;
  EXPECT_EQ(item.hash.size(), foundItem->hash.size());
  EXPECT_EQ(memcmp(item.hash.data(), foundItem->hash.data(), item.hash.size()),
            0);
  std::cout << "==> update item" << std::endl;
  const std::string newS3Path = randomString();
  dbm->updateBlobItem(foundItem->hash, "removeCandidate",
                      std::to_string(!foundItem->removeCandidate));
  dbm->updateBlobItem(foundItem->hash, "s3Path", newS3Path);
  foundItem = std::dynamic_pointer_cast<BlobItem>(dbm->findBlobItem(item.hash));
  EXPECT_TRUE(foundItem->removeCandidate != item.removeCandidate);
  EXPECT_TRUE(foundItem->s3Path == newS3Path);
  std::cout << "==> remove item" << std::endl;
  dbm->removeBlobItem(foundItem->hash);
  std::cout << "==> done" << std::endl;
}

TEST_F(DatabaseManagerTest, TestOperationsOnReverseIndexItems) {
  const ReverseIndexItem item = generateReverseIndexItem();

  std::cout << "==> create db manager" << std::endl;
  std::cout << "==> put item" << std::endl;
  dbm->putReverseIndexItem(item);
  std::cout << "==> find item by hash" << std::endl;
  std::shared_ptr<ReverseIndexItem> foundItem;
  foundItem = std::dynamic_pointer_cast<ReverseIndexItem>(
      dbm->findReverseIndexItemByHash(item.hash));
  std::cout << "==> checking hashes" << std::endl;
  EXPECT_EQ(item.hash.size(), foundItem->hash.size());
  EXPECT_EQ(memcmp(item.hash.data(), foundItem->hash.data(), item.hash.size()),
            0);
  std::cout << "==> find item by reverse index" << std::endl;
  foundItem = std::dynamic_pointer_cast<ReverseIndexItem>(
      dbm->findReverseIndexItemByReverseIndex(item.reverseIndex));
  std::cout << "==> checking hashes" << std::endl;
  EXPECT_EQ(item.hash.size(), foundItem->hash.size());
  EXPECT_EQ(memcmp(item.hash.data(), foundItem->hash.data(), item.hash.size()),
            0);
  std::cout << "==> remove item" << std::endl;
  dbm->removeReverseIndexItem(foundItem->hash);
  std::cout << "==> done" << std::endl;
}
