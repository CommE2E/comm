#pragma once

#include "BackupItem.h"
#include "DatabaseEntitiesTools.h"
#include "DatabaseManagerBase.h"
#include "DynamoDBTools.h"
#include "LogItem.h"

#include <aws/core/Aws.h>
#include <aws/dynamodb/model/AttributeDefinition.h>
#include <aws/dynamodb/model/GetItemRequest.h>
#include <aws/dynamodb/model/PutItemRequest.h>

#include <memory>
#include <string>

namespace comm {
namespace network {
namespace database {

// this class should be thread-safe in case any shared resources appear
class DatabaseManager : public DatabaseManagerBase {
public:
  static DatabaseManager &getInstance();

  void putBackupItem(const BackupItem &item);
  std::shared_ptr<BackupItem>
  findBackupItem(const std::string &userID, const std::string &backupID);
  std::shared_ptr<BackupItem> findLastBackupItem(const std::string &userID);
  void removeBackupItem(std::shared_ptr<BackupItem> item);

  void putLogItem(const LogItem &item);
  std::shared_ptr<LogItem>
  findLogItem(const std::string &backupID, const std::string &logID);
  std::vector<std::shared_ptr<LogItem>>
  findLogItemsForBackup(const std::string &backupID);
  void removeLogItem(std::shared_ptr<LogItem> item);
};

} // namespace database
} // namespace network
} // namespace comm
