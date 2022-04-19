#pragma once

#include "Item.h"

#include <string>
#include <vector>

namespace comm {
namespace network {
namespace database {

/*
 * log - a single log record
 *  `backupID` - id of the backup that this log is assigned to
 *  `value` - either the value itself which is a dump of a single operation (if
 * `persistedInBlob` is false) or the holder to blob (if `persistedInBlob` is
 * true)
 *  `attachmentHolders` - this is a list of attachment references
 */
class LogItem : public Item {

  std::string backupID;
  std::string logID;
  bool persistedInBlob;
  std::string value;
  std::vector<std::string> attachmentHolders;

  void validate() const override;

public:
  static std::string tableName;
  static const std::string FIELD_BACKUP_ID;
  static const std::string FIELD_LOG_ID;
  static const std::string FIELD_PERSISTED_IN_BLOB;
  static const std::string FIELD_VALUE;
  static const std::string FIELD_ATTACHMENT_HOLDERS;

  LogItem() {
  }
  LogItem(
      const std::string backupID,
      const std::string logID,
      const bool persistedInBlob,
      const std::string value,
      std::vector<std::string> attachmentHolders);
  LogItem(const AttributeValues &itemFromDB);

  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;

  std::string getTableName() const override;
  PrimaryKey getPrimaryKey() const override;
  PrimaryKeyValue getPrimaryKeyValue() const override;

  std::string getBackupID() const;
  std::string getLogID() const;
  bool getPersistedInBlob() const;
  std::string getValue() const;
  std::vector<std::string> getAttachmentHolders() const;
};

} // namespace database
} // namespace network
} // namespace comm
