#include "BackupItem.h"

#include "Constants.h"

namespace comm {
namespace network {
namespace database {

const std::string BackupItem::FIELD_ID = "id";
const std::string BackupItem::FIELD_COMPACTION_ID = "compactionID";
const std::string BackupItem::FIELD_ENCRYPTED_BACKUP_KEY = "encryptedBackupKey";
const std::string BackupItem::FIELD_CREATED = "created";

std::string BackupItem::tableName = BACKUP_TABLE_NAME;

BackupItem::BackupItem(
    std::string id,
    std::string compactionID,
    std::string encryptedBackupKey,
    uint64_t created)
    : id(id),
      compactionID(compactionID),
      encryptedBackupKey(encryptedBackupKey),
      created(created) {
  this->validate();
}

BackupItem::BackupItem(const AttributeValues &itemFromDB) {
  this->assignItemFromDatabase(itemFromDB);
}

void BackupItem::validate() const {
  if (!this->id.size()) {
    throw std::runtime_error("id empty");
  }
  if (!this->compactionID.size()) {
    throw std::runtime_error("compactionID empty");
  }
  if (!this->encryptedBackupKey.size()) {
    throw std::runtime_error("encryptedBackupKey empty");
  }
}

void BackupItem::assignItemFromDatabase(const AttributeValues &itemFromDB) {
  try {
    this->id = itemFromDB.at(BackupItem::FIELD_ID).GetS();
    this->compactionID = itemFromDB.at(BackupItem::FIELD_COMPACTION_ID).GetS();
    this->encryptedBackupKey =
        itemFromDB.at(BackupItem::FIELD_ENCRYPTED_BACKUP_KEY).GetS();
    this->created = std::stoll(
        std::string(itemFromDB.at(BackupItem::FIELD_CREATED).GetS()).c_str());
  } catch (std::out_of_range &e) {
    throw std::runtime_error(
        "invalid backup item provided, " + std::string(e.what()));
  }
  this->validate();
}

std::string BackupItem::getTableName() const {
  return BackupItem::tableName;
}

std::string BackupItem::getPrimaryKey() const {
  return BackupItem::FIELD_ID;
}

std::string BackupItem::getID() const {
  return this->id;
}

std::string BackupItem::getCompactionID() const {
  return this->compactionID;
}

std::string BackupItem::getEncryptedBackupKey() const {
  return this->encryptedBackupKey;
}

uint64_t BackupItem::getCreated() const {
  return this->created;
}

} // namespace database
} // namespace network
} // namespace comm
