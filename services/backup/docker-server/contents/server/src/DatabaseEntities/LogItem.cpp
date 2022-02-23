#include "LogItem.h"

#include "AwsTools.h"
#include "Constants.h"

#include <stdexcept>

namespace comm {
namespace network {
namespace database {

const std::string LogItem::FIELD_BACKUP_ID = "backupID";
const std::string LogItem::FIELD_LOG_ID = "logID";
const std::string LogItem::FIELD_PERSISTED_IN_BLOB = "persistedInBlob";
const std::string LogItem::FIELD_VALUE = "value";
const std::string LogItem::FIELD_ATTACHMENT_HOLDERS = "attachmentHolders";

std::string LogItem::tableName = LOG_TABLE_NAME;

LogItem::LogItem(
    const std::string backupID,
    const std::string logID,
    const bool persistedInBlob,
    const std::string value,
    std::vector<std::string> attachmentHolders)
    : backupID(backupID),
      logID(logID),
      persistedInBlob(persistedInBlob),
      value(value),
      attachmentHolders(attachmentHolders) {
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
  // todo maybe check if values is not too big if persistedInBlob is false
}

void LogItem::assignItemFromDatabase(const AttributeValues &itemFromDB) {
  try {
    this->backupID = itemFromDB.at(LogItem::FIELD_BACKUP_ID).GetS();
    this->logID = itemFromDB.at(LogItem::FIELD_LOG_ID).GetS();
    this->persistedInBlob = std::stoi(
        std::string(itemFromDB.at(LogItem::FIELD_PERSISTED_IN_BLOB).GetS())
            .c_str());
    this->value = itemFromDB.at(LogItem::FIELD_VALUE).GetS();
    this->attachmentHolders =
        itemFromDB.at(LogItem::FIELD_ATTACHMENT_HOLDERS).GetSS();
  } catch (std::logic_error &e) {
    throw std::runtime_error(
        "invalid log item provided, " + std::string(e.what()));
  }
  this->validate();
}

std::string LogItem::getTableName() const {
  return LogItem::tableName;
}

std::string LogItem::getPrimaryKey() const {
  return LogItem::FIELD_BACKUP_ID;
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

std::vector<std::string> LogItem::getAttachmentHolders() const {
  return this->attachmentHolders;
}

} // namespace database
} // namespace network
} // namespace comm
