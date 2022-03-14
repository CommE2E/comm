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
  auto it = this->dbSimulator.backup.find(userID);
  if (it == this->dbSimulator.backup.end()) {
    return nullptr;
  }
  if (it->second->empty()) {
    return nullptr;
  }
  return std::make_shared<BackupItem>((--it->second->end())->second);
}

void DatabaseManager::removeBackupItem(std::shared_ptr<BackupItem> item) {
  auto it = this->dbSimulator.backup.find(item->getUserID());
  if (it == this->dbSimulator.backup.end()) {
    return;
  }
  it->second->erase(item->getCreated());
}

void DatabaseManager::putLogItem(const LogItem &item) {
  if (this->dbSimulator.log.find(item.getBackupID()) ==
      this->dbSimulator.log.end()) {
    this->dbSimulator.log.insert(
        item.getBackupID(),
        std::make_unique<std::vector<std::shared_ptr<LogItem>>>());
  }
  this->dbSimulator.log.find(item.getBackupID())
      ->second->push_back(std::make_shared<LogItem>(
          item.getBackupID(),
          item.getLogID(),
          item.getPersistedInBlob(),
          item.getValue(),
          item.getAttachmentHolders()));
}

std::vector<std::shared_ptr<LogItem>>
DatabaseManager::findLogItemsForBackup(const std::string &backupID) {
  auto it = this->dbSimulator.log.find(backupID);
  if (it == this->dbSimulator.log.end()) {
    return {};
  }
  return *it->second;
}

void DatabaseManager::removeLogItem(std::shared_ptr<LogItem> item) {
  auto foundIt = this->dbSimulator.log.find(item->getBackupID());
  if (foundIt == this->dbSimulator.log.end()) {
    return;
  }
  for (auto it = foundIt->second->begin(); it != foundIt->second->end();) {
    if (it->get()->getLogID() == item->getLogID()) {
      it = foundIt->second->erase(it);
    } else {
      ++it;
    }
  }
}

} // namespace database
} // namespace network
} // namespace comm
