#include <gtest/gtest.h>

#include "DatabaseManager.h"
#include "Tools.h"

#include <iostream>

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
  return prefix + std::to_string(comm::network::getCurrentTimestamp());
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
          item.getRecoveryData().size()),
      0);

  DatabaseManager::getInstance().removeUserPersistItem(item.getUserID());
  EXPECT_EQ(
      DatabaseManager::getInstance().findUserPersistItem(item.getUserID()),
      nullptr);
}

TEST_F(DatabaseManagerTest, TestOperationsOnBackupItems) {
  const BackupItem item(
      generateName("backup001"),
      generateName("compaction001"),
      generateName("encryptedBackupKey"),
      comm::network::getCurrentTimestamp());

  DatabaseManager::getInstance().putBackupItem(item);
  std::shared_ptr<BackupItem> foundItem =
      DatabaseManager::getInstance().findBackupItem(item.getID());
  EXPECT_NE(foundItem, nullptr);
  EXPECT_EQ(item.getCompactionID(), foundItem->getCompactionID());
  EXPECT_EQ(
      memcmp(
          item.getEncryptedBackupKey().data(),
          foundItem->getEncryptedBackupKey().data(),
          item.getEncryptedBackupKey().size()),
      0);
  EXPECT_EQ(item.getCreated(), foundItem->getCreated());

  DatabaseManager::getInstance().removeBackupItem(item.getID());
  EXPECT_EQ(
      DatabaseManager::getInstance().findBackupItem(item.getID()), nullptr);
}
