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
  return prefix + "-" + std::to_string(comm::network::getCurrentTimestamp());
}

TEST_F(DatabaseManagerTest, TestOperationsOnBackupItems) {
  auto generateBackupItem = [](const std::string &userID,
                               const std::string &backupID) {
    return BackupItem(
        userID,
        backupID,
        comm::network::getCurrentTimestamp(),
        "xxx",
        "xxx",
        {""});
  };

  const std::string userID = generateName("user001");

  std::vector<std::string> backupIDs = {"backup001", "backup002", "backup003"};
  for (const std::string &backupID : backupIDs) {
    DatabaseManager::getInstance().putBackupItem(
        generateBackupItem(userID, backupID));
  }

  std::shared_ptr<BackupItem> item;
  while (!backupIDs.empty()) {
    item = DatabaseManager::getInstance().findLastBackupItem(userID);
    EXPECT_NE(item, nullptr);
    EXPECT_EQ(item->getBackupID(), backupIDs.back());
    backupIDs.pop_back();
    DatabaseManager::getInstance().removeBackupItem(item);
  };
  EXPECT_EQ(DatabaseManager::getInstance().findLastBackupItem(userID), nullptr);
}
