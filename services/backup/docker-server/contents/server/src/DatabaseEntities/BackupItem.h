#pragma once

#include "Item.h"

#include <string>

namespace comm {
namespace network {
namespace database {

class BackupItem : public Item {

  std::string id;
  std::string compactionID;
  std::string encryptedBackupKey;
  uint64_t created = 0;

  void validate() const override;

public:
  static std::string tableName;
  static const std::string FIELD_ID;
  static const std::string FIELD_COMPACTION_ID;
  static const std::string FIELD_ENCRYPTED_BACKUP_KEY;
  static const std::string FIELD_CREATED;

  BackupItem() {
  }
  BackupItem(
      std::string id,
      std::string compactionID,
      std::string encryptedBackupKey,
      uint64_t created = 0);
  BackupItem(const AttributeValues &itemFromDB);

  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;

  std::string getTableName() const override;
  std::string getPrimaryKey() const override;

  std::string getID() const;
  std::string getCompactionID() const;
  std::string getEncryptedBackupKey() const;
  uint64_t getCreated() const;
};

} // namespace database
} // namespace network
} // namespace comm
