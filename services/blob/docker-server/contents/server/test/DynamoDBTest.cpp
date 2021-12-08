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
  BlobItem item = generateBlobItem();

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
  std::cout << "==> remove item" << std::endl;
  dbm->removeBlobItem(foundItem->hash);
  std::cout << "==> done" << std::endl;
}

TEST_F(DatabaseManagerTest, TestOperationsOnReverseIndexItems) {
  ReverseIndexItem item = generateReverseIndexItem();

  std::cout << "==> create db manager" << std::endl;
  std::cout << "==> put item" << std::endl;
  dbm->putReverseIndexItem(item);
  std::cout << "==> find item" << std::endl;
  std::shared_ptr<ReverseIndexItem> foundItem =
      std::dynamic_pointer_cast<ReverseIndexItem>(
          dbm->findReverseIndexItem(item.hash));
  std::cout << "==> checking hashes" << std::endl;
  EXPECT_EQ(item.hash.size(), foundItem->hash.size());
  EXPECT_EQ(memcmp(item.hash.data(), foundItem->hash.data(), item.hash.size()),
            0);
  std::cout << "==> remove item" << std::endl;
  dbm->removeReverseIndexItem(foundItem->hash);
  std::cout << "==> done" << std::endl;
}
