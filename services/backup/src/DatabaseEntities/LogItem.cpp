#include "LogItem.h"

#include "Constants.h"
#include "Tools.h"

#include <stdexcept>

namespace comm {
namespace network {
namespace database {

const std::string LogItem::FIELD_BACKUP_ID = "backupID";
const std::string LogItem::FIELD_LOG_ID = "logID";
const std::string LogItem::FIELD_PERSISTED_IN_BLOB = "persistedInBlob";
const std::string LogItem::FIELD_VALUE = "value";
const std::string LogItem::FIELD_ATTACHMENT_HOLDERS = "attachmentHolders";
const std::string LogItem::FIELD_DATA_HASH = "dataHash";

const std::string LogItem::TABLE_NAME = LOG_TABLE_NAME;

LogItem::LogItem(
    const std::string backupID,
    const std::string logID,
    const bool persistedInBlob,
    const std::string value,
    std::string attachmentHolders,
    const std::string dataHash)
    : backupID(backupID),
      logID(logID),
      persistedInBlob(persistedInBlob),
      value(value),
      attachmentHolders(attachmentHolders),
      dataHash(dataHash) {
  this->validate();
}

LogItem::LogItem(const AttributeValues &itemFromDB) {
  this->assignItemFromDatabase(itemFromDB);
}

void LogItem::validate() const {
  if (!this->backupID.size()) {
    throw std::runtime_error("backupID empty");
  }
  if (!this->logID.size()) {
    throw std::runtime_error("logID empty");
  }
  if (!this->value.size()) {
    throw std::runtime_error("value empty");
  }
  const size_t itemSize = LogItem::getItemSize(this);
  if (!this->persistedInBlob && itemSize > LOG_DATA_SIZE_DATABASE_LIMIT) {
    throw std::runtime_error(
        "the value of this log is too big to be stored in the database, it "
        "should be stored in the blob instead (" +
        std::to_string(itemSize) + "/" +
        std::to_string(LOG_DATA_SIZE_DATABASE_LIMIT) + ")");
  }
  if (!this->dataHash.size()) {
    throw std::runtime_error("data hash empty");
  }
}

void LogItem::assignItemFromDatabase(const AttributeValues &itemFromDB) {
  try {
    this->backupID = itemFromDB.at(LogItem::FIELD_BACKUP_ID).GetS();
    this->logID = itemFromDB.at(LogItem::FIELD_LOG_ID).GetS();
    this->persistedInBlob = std::stoi(
        std::string(itemFromDB.at(LogItem::FIELD_PERSISTED_IN_BLOB).GetS())
            .c_str());
    this->value = itemFromDB.at(LogItem::FIELD_VALUE).GetS();
    auto attachmentsHolders =
        itemFromDB.find(LogItem::FIELD_ATTACHMENT_HOLDERS);
    if (attachmentsHolders != itemFromDB.end()) {
      this->attachmentHolders = attachmentsHolders->second.GetS();
    }
    this->dataHash = itemFromDB.at(LogItem::FIELD_DATA_HASH).GetS();
  } catch (std::logic_error &e) {
    throw std::runtime_error(
        "invalid log item provided, " + std::string(e.what()));
  }
  this->validate();
}

std::string LogItem::getTableName() const {
  return LogItem::TABLE_NAME;
}

PrimaryKeyDescriptor LogItem::getPrimaryKeyDescriptor() const {
  return PrimaryKeyDescriptor(LogItem::FIELD_BACKUP_ID, LogItem::FIELD_LOG_ID);
}

PrimaryKeyValue LogItem::getPrimaryKeyValue() const {
  return PrimaryKeyValue(this->backupID, this->logID);
}

std::string LogItem::getBackupID() const {
  return this->backupID;
}

std::string LogItem::getLogID() const {
  return this->logID;
}

bool LogItem::getPersistedInBlob() const {
  return this->persistedInBlob;
}

std::string LogItem::getValue() const {
  return this->value;
}

std::string LogItem::getAttachmentHolders() const {
  return this->attachmentHolders;
}

std::string LogItem::getDataHash() const {
  return this->dataHash;
}

void LogItem::addAttachmentHolders(const std::string &attachmentHolders) {
  this->attachmentHolders +=
      tools::validateAttachmentHolders(attachmentHolders);
}

size_t LogItem::getItemSize(const LogItem *item) {
  size_t size = 0;

  size += LogItem::FIELD_BACKUP_ID.size();
  size += LogItem::FIELD_LOG_ID.size();
  size += LogItem::FIELD_PERSISTED_IN_BLOB.size();
  size += LogItem::FIELD_VALUE.size();
  size += LogItem::FIELD_ATTACHMENT_HOLDERS.size();
  size += LogItem::FIELD_DATA_HASH.size();

  size += item->getBackupID().size();
  size += item->getLogID().size();
  size += std::to_string(item->getPersistedInBlob()).size();
  size += item->getValue().size();
  size += item->getAttachmentHolders().size();
  size += item->getDataHash().size();

  return size;
}

} // namespace database
} // namespace network
} // namespace comm
