#include <gtest/gtest.h>

#include "DatabaseManager.h"
#include "GlobalTools.h"
#include "Tools.h"

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
  return prefix + "-" +
      std::to_string(comm::network::tools::getCurrentTimestamp());
}

BackupItem
generateBackupItem(const std::string &userID, const std::string &backupID) {
  return BackupItem(
      userID,
      backupID,
      comm::network::tools::getCurrentTimestamp(),
      "xxx",
      "xxx",
      "");
}

LogItem generateLogItem(const std::string &backupID, const std::string &logID) {
  return LogItem(
      backupID, logID, false, "xxx", "", "1655e920c4eda97e0be1acae74a5ab51");
}

TEST_F(DatabaseManagerTest, TestOperationsOnBackupItems) {
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

TEST_F(DatabaseManagerTest, TestOperationsOnLogItems) {
  const std::string backupID1 = generateName("backup001");
  const std::string backupID2 = generateName("backup002");

  std::vector<std::string> logIDs1 = {"log001", "log002", "log003"};
  for (const std::string &logID : logIDs1) {
    LogItem generatedItem = generateLogItem(backupID1, logID);
    DatabaseManager::getInstance().putLogItem(generatedItem);
    std::shared_ptr<LogItem> foundItem =
        DatabaseManager::getInstance().findLogItem(backupID1, logID);
    EXPECT_NE(foundItem, nullptr);
    EXPECT_EQ(foundItem->getBackupID(), generatedItem.getBackupID());
    EXPECT_EQ(foundItem->getLogID(), generatedItem.getLogID());
    EXPECT_EQ(
        foundItem->getPersistedInBlob(), generatedItem.getPersistedInBlob());
    EXPECT_EQ(foundItem->getValue(), generatedItem.getValue());
    EXPECT_EQ(
        foundItem->getAttachmentHolders(),
        generatedItem.getAttachmentHolders());
  }
  std::vector<std::string> logIDs2 = {"log021", "log022"};
  for (const std::string &logID : logIDs2) {
    LogItem generatedItem = generateLogItem(backupID2, logID);
    DatabaseManager::getInstance().putLogItem(generatedItem);
    std::shared_ptr<LogItem> foundItem =
        DatabaseManager::getInstance().findLogItem(backupID2, logID);
    EXPECT_NE(foundItem, nullptr);
    EXPECT_EQ(foundItem->getBackupID(), generatedItem.getBackupID());
    EXPECT_EQ(foundItem->getLogID(), generatedItem.getLogID());
    EXPECT_EQ(
        foundItem->getPersistedInBlob(), generatedItem.getPersistedInBlob());
    EXPECT_EQ(foundItem->getValue(), generatedItem.getValue());
    EXPECT_EQ(
        foundItem->getAttachmentHolders(),
        generatedItem.getAttachmentHolders());
  }

  std::vector<std::shared_ptr<LogItem>> items1 =
      DatabaseManager::getInstance().findLogItemsForBackup(backupID1);

  std::vector<std::shared_ptr<LogItem>> items2 =
      DatabaseManager::getInstance().findLogItemsForBackup(backupID2);

  EXPECT_EQ(items1.size(), 3);
  EXPECT_EQ(items2.size(), 2);

  for (size_t i = 0; i < items1.size(); ++i) {
    EXPECT_EQ(logIDs1.at(i), items1.at(i)->getLogID());
    DatabaseManager::getInstance().removeLogItem(items1.at(i));
    EXPECT_EQ(
        DatabaseManager::getInstance().findLogItem(backupID1, logIDs1.at(i)),
        nullptr);
  }
  EXPECT_EQ(
      DatabaseManager::getInstance().findLogItemsForBackup(backupID1).size(),
      0);

  for (size_t i = 0; i < items2.size(); ++i) {
    EXPECT_EQ(logIDs2.at(i), items2.at(i)->getLogID());
    DatabaseManager::getInstance().removeLogItem(items2.at(i));
    EXPECT_EQ(
        DatabaseManager::getInstance().findLogItem(backupID2, logIDs2.at(i)),
        nullptr);
  }
  EXPECT_EQ(
      DatabaseManager::getInstance().findLogItemsForBackup(backupID2).size(),
      0);
}
