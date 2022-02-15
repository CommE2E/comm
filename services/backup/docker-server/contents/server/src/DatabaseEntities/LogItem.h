#pragma once

#include "Item.h"

#include <string>
#include <vector>

namespace comm {
namespace network {
namespace database {

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
  std::string getPrimaryKey() const override;

  std::string getBackupID() const;
  std::string getLogID() const;
  bool getPersistedInBlob() const;
  std::string getValue() const;
  std::vector<std::string> getAttachmentHolders() const;
};

} // namespace database
} // namespace network
} // namespace comm
