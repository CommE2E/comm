#pragma once

#include "Item.h"

#include <string>
#include <vector>

namespace comm {
namespace network {
namespace database {

/**
 * this class is used for representing two things: the rows in the main table,
 * and also the rows in the secondary index
 *
 * Needs userID(pk)-created(sk)-index that projects:
 *  userID
 *  backupID
 *  created
 *  recoveryData
 */
class BackupItem : public Item {

  std::string userID;
  std::string backupID;
  uint64_t created;
  std::string recoveryData;
  std::string compactionHolder;
  std::vector<std::string> attachmentHolders;

  void validate() const override;

public:
  static std::string tableName;
  static const std::string FIELD_USER_ID;
  static const std::string FIELD_BACKUP_ID;
  static const std::string FIELD_CREATED;
  static const std::string FIELD_RECOVERY_DATA;
  static const std::string FIELD_COMPACTION_HOLDER;
  static const std::string FIELD_ATTACHMENT_HOLDERS;

  BackupItem() {
  }
  BackupItem(
      std::string userID,
      std::string backupID,
      uint64_t created,
      std::string recoveryData,
      std::string compactionHolder,
      std::vector<std::string> attachmentHolders);
  BackupItem(const AttributeValues &itemFromDB);

  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;

  std::string getTableName() const override;
  PrimaryKey getPrimaryKey() const override;
  PrimaryKeyValue getPrimaryKeyValue() const override;

  std::string getUserID() const;
  std::string getBackupID() const;
  uint64_t getCreated() const;
  std::string getRecoveryData() const;
  std::string getCompactionHolder() const;
  std::vector<std::string> getAttachmentHolders() const;
};

} // namespace database
} // namespace network
} // namespace comm
