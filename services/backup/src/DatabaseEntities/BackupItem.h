#pragma once

#include "Item.h"

#include <string>

namespace comm {
namespace network {
namespace database {

/**
 * backup - backups assigned to users along with the data necessary to
 * decrypt
 *  `created` - when the backup was created. This is a search key because
 *    we want to be able to perform effective queries based on this info
 *    (for example get me the latest backup, get me backup from some day)
 *  `attachmentHolders` - this is a list of attachment references
 *  `recoveryData` - data serialized with protobuf which is described by
 *    one of the following structures:
 *      { authType: 'password', pakePasswordCiphertext: string, nonce: string }
 *      { authType: 'wallet', walletAddress: string, rawMessage: string }
 *
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
  std::string attachmentHolders;

  void validate() const override;

public:
  static const std::string TABLE_NAME;
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
      std::string attachmentHolders);
  BackupItem(const AttributeValues &itemFromDB);

  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;

  std::string getTableName() const override;
  PrimaryKeyDescriptor getPrimaryKeyDescriptor() const override;
  PrimaryKeyValue getPrimaryKeyValue() const override;

  std::string getUserID() const;
  std::string getBackupID() const;
  uint64_t getCreated() const;
  std::string getRecoveryData() const;
  std::string getCompactionHolder() const;
  std::string getAttachmentHolders() const;

  void addAttachmentHolders(const std::string &attachmentHolders);
};

} // namespace database
} // namespace network
} // namespace comm
