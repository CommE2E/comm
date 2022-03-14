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

BackupItem
generateBackupItem(const std::string &userID, const std::string &backupID) {
  // this simulates operations that are going to occur one after another on the
  // timeline. For the dev mode this was failing when reading the current time
  // because operations on collections were fast and occuring at the same
  // exact millisecond. In practice, this should never happen (grpc connection
  // should cause the delay)
  static uint64_t operationID = comm::network::getCurrentTimestamp();
  return BackupItem(userID, backupID, operationID++, "xxx", "xxx", {""});
}

LogItem generateLogItem(const std::string &backupID, const std::string &logID) {
  return LogItem(backupID, logID, false, "xxx", {""});
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
    DatabaseManager::getInstance().putLogItem(
        generateLogItem(backupID1, logID));
  }
  std::vector<std::string> logIDs2 = {"log021", "log022"};
  for (const std::string &logID : logIDs2) {
    DatabaseManager::getInstance().putLogItem(
        generateLogItem(backupID2, logID));
  }

  std::vector<std::shared_ptr<LogItem>> items1 =
      DatabaseManager::getInstance().findLogItemsForBackup(backupID1);

  std::vector<std::shared_ptr<LogItem>> items2 =
      DatabaseManager::getInstance().findLogItemsForBackup(backupID2);

  EXPECT_EQ(items1.size(), 3);
  EXPECT_EQ(items2.size(), 2);

  for (size_t i = 0; i < items1.size(); ++i) {
    EXPECT_NE(
        std::find(logIDs1.begin(), logIDs1.end(), items1.at(i)->getLogID()),
        logIDs1.end());
    DatabaseManager::getInstance().removeLogItem(items1.at(i));
  }
  EXPECT_EQ(
      DatabaseManager::getInstance().findLogItemsForBackup(backupID1).size(),
      0);

  for (size_t i = 0; i < items2.size(); ++i) {
    EXPECT_NE(
        std::find(logIDs2.begin(), logIDs2.end(), items2.at(i)->getLogID()),
        logIDs2.end());
    DatabaseManager::getInstance().removeLogItem(items2.at(i));
  }
  EXPECT_EQ(
      DatabaseManager::getInstance().findLogItemsForBackup(backupID2).size(),
      0);
}
