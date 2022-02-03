#pragma once

#include "Item.h"

#include <string>

namespace comm {
namespace network {
namespace database {

class UserPersistItem : public Item {

  std::string userID;
  std::vector<std::string> backupIDs;
  std::string recoveryData;

  void validate() const override;

public:
  static std::string tableName;
  static const std::string FIELD_USER_ID;
  static const std::string FIELD_BACKUP_IDS;
  static const std::string FIELD_RECOVERY_DATA;

  UserPersistItem() {
  }
  UserPersistItem(
      const std::string userID,
      std::vector<std::string> backupIDs,
      std::string recoveryData);
  UserPersistItem(const AttributeValues &itemFromDB);

  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;

  std::string getTableName() const override;
  std::string getPrimaryKey() const override;

  std::string getUserID() const;
  std::vector<std::string> getBackupIDs() const;
  std::string getRecoveryData() const;
};

} // namespace database
} // namespace network
} // namespace comm
