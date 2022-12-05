#pragma once

#include "Item.h"

#include <string>

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
  std::string attachmentHolders;
  std::string dataHash;

  void validate() const override;

public:
  static const std::string TABLE_NAME;
  static const std::string FIELD_BACKUP_ID;
  static const std::string FIELD_LOG_ID;
  static const std::string FIELD_PERSISTED_IN_BLOB;
  static const std::string FIELD_VALUE;
  static const std::string FIELD_ATTACHMENT_HOLDERS;
  static const std::string FIELD_DATA_HASH;

  LogItem() {
  }
  LogItem(
      const std::string backupID,
      const std::string logID,
      const bool persistedInBlob,
      const std::string value,
      std::string attachmentHolders,
      const std::string dataHash);
  LogItem(const AttributeValues &itemFromDB);

  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;

  std::string getTableName() const override;
  PrimaryKeyDescriptor getPrimaryKeyDescriptor() const override;
  PrimaryKeyValue getPrimaryKeyValue() const override;

  std::string getBackupID() const;
  std::string getLogID() const;
  bool getPersistedInBlob() const;
  std::string getValue() const;
  std::string getAttachmentHolders() const;
  std::string getDataHash() const;

  void addAttachmentHolders(const std::string &attachmentHolders);

  static size_t getItemSize(const LogItem *item);
};

} // namespace database
} // namespace network
} // namespace comm
