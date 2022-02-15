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

void DatabaseManager::putBackupItem(const BackupItem &item) {
  std::shared_ptr<BackupItem> backupItem = std::make_shared<BackupItem>(
      item.getUserID(),
      item.getBackupID(),
      item.getCreated(),
      item.getRecoveryData(),
      item.getCompactionHolder(),
      item.getAttachmentHolders());
  if (this->dbSimulator.backup.find(item.getUserID()) ==
      this->dbSimulator.backup.end()) {
    this->dbSimulator.backup.insert(
        item.getUserID(), std::make_unique<std::map<uint64_t, BackupItem>>());
  }
  this->dbSimulator.backup.find(item.getUserID())
      ->second->insert({backupItem->getCreated(), *backupItem});
}

std::shared_ptr<BackupItem>
DatabaseManager::findLastBackupItem(const std::string &userID) {
  if (this->dbSimulator.backup.find(userID) == this->dbSimulator.backup.end()) {
    return nullptr;
  }
  if (this->dbSimulator.backup.find(userID)->second->empty()) {
    return nullptr;
  }
  return std::make_shared<BackupItem>(
      (--this->dbSimulator.backup.find(userID)->second->end())->second);
}

void DatabaseManager::removeBackupItem(std::shared_ptr<BackupItem> item) {
  if (this->dbSimulator.backup.find(item->getUserID()) ==
      this->dbSimulator.backup.end()) {
    return;
  }
  this->dbSimulator.backup.find(item->getUserID())
      ->second->erase(item->getCreated());
}

void DatabaseManager::putLogItem(const LogItem &item) {
  this->dbSimulator.log.insert(
      item.getLogID(),
      std::make_shared<LogItem>(
          item.getBackupID(),
          item.getLogID(),
          item.getPersistedInBlob(),
          item.getValue(),
          item.getAttachmentHolders()));
}

std::vector<std::shared_ptr<LogItem>>
DatabaseManager::findLogItemsForBackup(const std::string &backupID) {
  std::vector<std::shared_ptr<LogItem>> result;
  for (auto it = this->dbSimulator.log.begin();
       it != this->dbSimulator.log.end();
       ++it) {
    if (it->second->getBackupID() == backupID) {
      result.push_back(it->second);
    }
  }
  return result;
}

void DatabaseManager::removeLogItem(std::shared_ptr<LogItem> item) {
  this->dbSimulator.log.erase(item->getLogID());
}

} // namespace database
} // namespace network
} // namespace comm
