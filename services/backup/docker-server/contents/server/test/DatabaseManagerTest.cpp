#include <gtest/gtest.h>

#include "DatabaseManager.h"

#include <iostream>

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

std::string generateName(const std::string prefix = "") {
  std::chrono::milliseconds ms =
      std::chrono::duration_cast<std::chrono::milliseconds>(
          std::chrono::system_clock::now().time_since_epoch());
  return prefix + std::to_string(ms.count());
}

TEST_F(DatabaseManagerTest, TestOperationsOnUserPersistItems) {
  const UserPersistItem item(
      generateName("user001"),
      {generateName("backup1"), generateName("backup2")},
      generateName("some_bytes"));

  DatabaseManager::getInstance().putUserPersistItem(item);
  std::shared_ptr<UserPersistItem> foundItem =
      DatabaseManager::getInstance().findUserPersistItem(item.getUserID());
  EXPECT_NE(foundItem, nullptr);
  EXPECT_EQ(item.getBackupIDs().size(), foundItem->getBackupIDs().size());
  for (size_t i = 0; i < item.getBackupIDs().size(); ++i) {
    EXPECT_EQ(item.getBackupIDs().at(i), foundItem->getBackupIDs().at(i));
  }
  EXPECT_EQ(
      memcmp(
          item.getRecoveryData().data(),
          foundItem->getRecoveryData().data(),
          item.getBackupIDs().size()),
      0);

  DatabaseManager::getInstance().removeUserPersistItem(item.getUserID());
  EXPECT_EQ(
      DatabaseManager::getInstance().findUserPersistItem(item.getUserID()),
      nullptr);
}
