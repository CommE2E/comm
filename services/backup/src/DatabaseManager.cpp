#include "DatabaseManager.h"
#include "Constants.h"
#include "GlobalTools.h"
#include "Tools.h"

#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/DeleteItemRequest.h>
#include <aws/dynamodb/model/QueryRequest.h>
#include <aws/dynamodb/model/ScanRequest.h>
#include <aws/dynamodb/model/UpdateItemRequest.h>

#include <glog/logging.h>

namespace comm {
namespace network {
namespace database {

DatabaseManager &DatabaseManager::getInstance() {
  static DatabaseManager instance;
  return instance;
}

void DatabaseManager::putBackupItem(const BackupItem &item) {
  LOG(INFO) << "[DatabaseManager::putBackupItem] user id " << item.getUserID();
  LOG(INFO) << "[DatabaseManager::putBackupItem] backup id "
            << item.getBackupID();
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(BackupItem::tableName);
  request.AddItem(
      BackupItem::FIELD_USER_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getUserID()));
  request.AddItem(
      BackupItem::FIELD_CREATED,
      Aws::DynamoDB::Model::AttributeValue(
          std::to_string(tools::getCurrentTimestamp())));
  request.AddItem(
      BackupItem::FIELD_BACKUP_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getBackupID()));
  request.AddItem(
      BackupItem::FIELD_RECOVERY_DATA,
      Aws::DynamoDB::Model::AttributeValue(item.getRecoveryData()));
  request.AddItem(
      BackupItem::FIELD_COMPACTION_HOLDER,
      Aws::DynamoDB::Model::AttributeValue(item.getCompactionHolder()));
  if (!item.getAttachmentHolders().empty()) {
    request.AddItem(
        BackupItem::FIELD_ATTACHMENT_HOLDERS,
        Aws::DynamoDB::Model::AttributeValue(item.getAttachmentHolders()));
  }

  this->innerPutItem(std::make_shared<BackupItem>(item), request);
}

std::shared_ptr<BackupItem> DatabaseManager::findBackupItem(
    const std::string &userID,
    const std::string &backupID) {
  LOG(INFO) << "[DatabaseManager::findBackupItem] user id " << userID;
  LOG(INFO) << "[DatabaseManager::findBackupItem] backup id " << backupID;
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      BackupItem::FIELD_USER_ID, Aws::DynamoDB::Model::AttributeValue(userID));
  request.AddKey(
      BackupItem::FIELD_BACKUP_ID,
      Aws::DynamoDB::Model::AttributeValue(backupID));

  return this->innerFindItem<BackupItem>(request);
}

std::shared_ptr<BackupItem>
DatabaseManager::findLastBackupItem(const std::string &userID) {
  LOG(INFO) << "[DatabaseManager::findLastBackupItem] user id " << userID;
  std::shared_ptr<BackupItem> item = createItemByType<BackupItem>();

  Aws::DynamoDB::Model::QueryRequest req;
  req.SetTableName(BackupItem::tableName);
  req.SetKeyConditionExpression(BackupItem::FIELD_USER_ID + " = :valueToMatch");

  AttributeValues attributeValues;
  attributeValues.emplace(":valueToMatch", userID);

  req.SetExpressionAttributeValues(attributeValues);
  req.SetIndexName("userID-created-index");

  req.SetLimit(1);
  req.SetScanIndexForward(false);

  const Aws::DynamoDB::Model::QueryOutcome &outcome =
      getDynamoDBClient()->Query(req);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  const Aws::Vector<AttributeValues> &items = outcome.GetResult().GetItems();
  if (items.empty()) {
    LOG(INFO) << "[DatabaseManager::findLastBackupItem] not found";
    return nullptr;
  }
  LOG(INFO) << "[DatabaseManager::findLastBackupItem] found";
  return std::make_shared<database::BackupItem>(items[0]);
}

void DatabaseManager::removeBackupItem(std::shared_ptr<BackupItem> item) {
  if (item == nullptr) {
    return;
  }
  LOG(INFO) << "[DatabaseManager::removeBackupItem]";
  this->innerRemoveItem(*item);
}

void DatabaseManager::putLogItem(const LogItem &item) {
  LOG(INFO) << "[DatabaseManager::putLogItem] backup id " << item.getBackupID();
  LOG(INFO) << "[DatabaseManager::putLogItem] log id " << item.getLogID();
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(LogItem::tableName);
  request.AddItem(
      LogItem::FIELD_BACKUP_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getBackupID()));
  request.AddItem(
      LogItem::FIELD_LOG_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getLogID()));
  request.AddItem(
      LogItem::FIELD_PERSISTED_IN_BLOB,
      Aws::DynamoDB::Model::AttributeValue(
          std::to_string(item.getPersistedInBlob())));
  request.AddItem(
      LogItem::FIELD_VALUE,
      Aws::DynamoDB::Model::AttributeValue(item.getValue()));
  if (!item.getAttachmentHolders().empty()) {
    request.AddItem(
        LogItem::FIELD_ATTACHMENT_HOLDERS,
        Aws::DynamoDB::Model::AttributeValue(item.getAttachmentHolders()));
  }
  request.AddItem(
      LogItem::FIELD_DATA_HASH,
      Aws::DynamoDB::Model::AttributeValue(item.getDataHash()));
  this->innerPutItem(std::make_shared<LogItem>(item), request);
}

std::shared_ptr<LogItem> DatabaseManager::findLogItem(
    const std::string &backupID,
    const std::string &logID) {
  LOG(INFO) << "[DatabaseManager::findLogItem] backup id " << backupID;
  LOG(INFO) << "[DatabaseManager::findLogItem] log id " << logID;
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      LogItem::FIELD_BACKUP_ID, Aws::DynamoDB::Model::AttributeValue(backupID));
  request.AddKey(
      LogItem::FIELD_LOG_ID, Aws::DynamoDB::Model::AttributeValue(logID));

  return this->innerFindItem<LogItem>(request);
}

std::vector<std::shared_ptr<LogItem>>
DatabaseManager::findLogItemsForBackup(const std::string &backupID) {
  LOG(INFO) << "[DatabaseManager::findLogItemsForBackup] backup id "
            << backupID;
  std::vector<std::shared_ptr<database::LogItem>> result;
  std::shared_ptr<LogItem> item = createItemByType<LogItem>();

  Aws::DynamoDB::Model::QueryRequest req;
  req.SetTableName(LogItem::tableName);
  req.SetKeyConditionExpression(LogItem::FIELD_BACKUP_ID + " = :valueToMatch");

  AttributeValues attributeValues;
  attributeValues.emplace(":valueToMatch", backupID);

  req.SetExpressionAttributeValues(attributeValues);

  const Aws::DynamoDB::Model::QueryOutcome &outcome =
      getDynamoDBClient()->Query(req);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  const Aws::Vector<AttributeValues> &items = outcome.GetResult().GetItems();
  for (auto &item : items) {
    result.push_back(std::make_shared<database::LogItem>(item));
  }

  LOG(INFO) << "[DatabaseManager::findLogItemsForBackup] result size "
            << result.size();
  return result;
}

void DatabaseManager::removeLogItem(std::shared_ptr<LogItem> item) {
  if (item == nullptr) {
    return;
  }
  LOG(INFO) << "[DatabaseManager::removeLogItem]";
  this->innerRemoveItem(*item);
}

} // namespace database
} // namespace network
} // namespace comm
