#include "UserPersistItem.h"

#include "AwsTools.h"
#include "Constants.h"

namespace comm {
namespace network {
namespace database {

const std::string UserPersistItem::FIELD_USER_ID = "userID";
const std::string UserPersistItem::FIELD_BACKUP_IDS = "backupIDs";
const std::string UserPersistItem::FIELD_RECOVERY_DATA = "recoveryData";

std::string UserPersistItem::tableName = USER_PERSIST_TABLE_NAME;

UserPersistItem::UserPersistItem(
    const std::string userID,
    std::vector<std::string> backupIDs,
    std::string recoveryData)
    : userID(userID), backupIDs(backupIDs), recoveryData(recoveryData) {
  this->validate();
}

UserPersistItem::UserPersistItem(const AttributeValues &itemFromDB) {
  this->assignItemFromDatabase(itemFromDB);
}

void UserPersistItem::validate() const {
  if (!this->userID.size()) {
    throw std::runtime_error("userID empty");
  }
}

void UserPersistItem::assignItemFromDatabase(
    const AttributeValues &itemFromDB) {
  this->userID = itemFromDB.at(UserPersistItem::FIELD_USER_ID).GetS();
  this->backupIDs = itemFromDB.at(UserPersistItem::FIELD_BACKUP_IDS).GetSS();
  this->recoveryData =
      itemFromDB.at(UserPersistItem::FIELD_RECOVERY_DATA).GetS();
  this->validate();
}

std::string UserPersistItem::getTableName() const {
  return UserPersistItem::tableName;
}

std::string UserPersistItem::getPrimaryKey() const {
  return UserPersistItem::FIELD_USER_ID;
}

std::string UserPersistItem::getUserID() const {
  return this->userID;
}

std::vector<std::string> UserPersistItem::getBackupIDs() const {
  return this->backupIDs;
}

std::string UserPersistItem::getRecoveryData() const {
  return this->recoveryData;
}

} // namespace database
} // namespace network
} // namespace comm
