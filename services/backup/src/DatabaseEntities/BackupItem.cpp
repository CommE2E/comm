#include "BackupItem.h"

#include "Constants.h"
#include "Tools.h"

namespace comm {
namespace network {
namespace database {

const std::string BackupItem::FIELD_USER_ID = "userID";
const std::string BackupItem::FIELD_BACKUP_ID = "backupID";
const std::string BackupItem::FIELD_CREATED = "created";
const std::string BackupItem::FIELD_RECOVERY_DATA = "recoveryData";
const std::string BackupItem::FIELD_COMPACTION_HOLDER = "compactionHolder";
const std::string BackupItem::FIELD_ATTACHMENT_HOLDERS = "attachmentHolders";

const std::string BackupItem::TABLE_NAME = BACKUP_TABLE_NAME;

BackupItem::BackupItem(
    std::string userID,
    std::string backupID,
    uint64_t created,
    std::string recoveryData,
    std::string compactionHolder,
    std::string attachmentHolders)
    : userID(userID),
      backupID(backupID),
      created(created),
      recoveryData(recoveryData),
      compactionHolder(compactionHolder),
      attachmentHolders(attachmentHolders) {
  this->validate();
}

BackupItem::BackupItem(const AttributeValues &itemFromDB) {
  this->assignItemFromDatabase(itemFromDB);
}

void BackupItem::validate() const {
  if (!this->userID.size()) {
    throw std::runtime_error("userID empty");
  }
  if (!this->backupID.size()) {
    throw std::runtime_error("backupID empty");
  }
  if (!this->created) {
    throw std::runtime_error("created not provided");
  }
  if (!this->recoveryData.size()) {
    throw std::runtime_error("recoveryData empty");
  }
}

void BackupItem::assignItemFromDatabase(const AttributeValues &itemFromDB) {
  try {
    this->userID = itemFromDB.at(BackupItem::FIELD_USER_ID).GetS();
    this->backupID = itemFromDB.at(BackupItem::FIELD_BACKUP_ID).GetS();
    this->created = std::stoll(
        std::string(itemFromDB.at(BackupItem::FIELD_CREATED).GetS()).c_str());
    this->recoveryData = itemFromDB.at(BackupItem::FIELD_RECOVERY_DATA).GetS();
    auto compactionHolder =
        itemFromDB.find(BackupItem::FIELD_COMPACTION_HOLDER);
    if (compactionHolder != itemFromDB.end()) {
      this->compactionHolder = compactionHolder->second.GetS();
    }
    auto attachmentsHolders =
        itemFromDB.find(BackupItem::FIELD_ATTACHMENT_HOLDERS);
    if (attachmentsHolders != itemFromDB.end()) {
      this->attachmentHolders = attachmentsHolders->second.GetS();
    }
  } catch (std::logic_error &e) {
    throw std::runtime_error(
        "invalid backup item provided, " + std::string(e.what()));
  }
  this->validate();
}

std::string BackupItem::getTableName() const {
  return BackupItem::TABLE_NAME;
}

PrimaryKeyDescriptor BackupItem::getPrimaryKeyDescriptor() const {
  return PrimaryKeyDescriptor(
      BackupItem::FIELD_USER_ID, BackupItem::FIELD_BACKUP_ID);
}

PrimaryKeyValue BackupItem::getPrimaryKeyValue() const {
  return PrimaryKeyValue(this->userID, this->backupID);
}

std::string BackupItem::getUserID() const {
  return this->userID;
}

std::string BackupItem::getBackupID() const {
  return this->backupID;
}

uint64_t BackupItem::getCreated() const {
  return this->created;
}

std::string BackupItem::getRecoveryData() const {
  return this->recoveryData;
}

std::string BackupItem::getCompactionHolder() const {
  return this->compactionHolder;
}

std::string BackupItem::getAttachmentHolders() const {
  return this->attachmentHolders;
}

void BackupItem::addAttachmentHolders(const std::string &attachmentHolders) {
  this->attachmentHolders +=
      tools::validateAttachmentHolders(attachmentHolders);
}

} // namespace database
} // namespace network
} // namespace comm
