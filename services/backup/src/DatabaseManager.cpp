#include "DatabaseManager.h"
#include "Constants.h"
#include "GlobalTools.h"
#include "Tools.h"

#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/DeleteItemRequest.h>
#include <aws/dynamodb/model/QueryRequest.h>
#include <aws/dynamodb/model/ScanRequest.h>
#include <aws/dynamodb/model/UpdateItemRequest.h>

namespace comm {
namespace network {
namespace database {

DatabaseManager &DatabaseManager::getInstance() {
  static DatabaseManager instance;
  return instance;
}

void DatabaseManager::putBackupItem(const BackupItem &item) {
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(BackupItem::TABLE_NAME);
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
  std::shared_ptr<BackupItem> item = createItemByType<BackupItem>();

  Aws::DynamoDB::Model::QueryRequest req;
  req.SetTableName(BackupItem::TABLE_NAME);
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
    return nullptr;
  }
  return std::make_shared<database::BackupItem>(items[0]);
}

void DatabaseManager::removeBackupItem(std::shared_ptr<BackupItem> item) {
  if (item == nullptr) {
    return;
  }
  this->innerRemoveItem(*item);
}

void DatabaseManager::putLogItem(const LogItem &item) {
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(LogItem::TABLE_NAME);
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
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      LogItem::FIELD_BACKUP_ID, Aws::DynamoDB::Model::AttributeValue(backupID));
  request.AddKey(
      LogItem::FIELD_LOG_ID, Aws::DynamoDB::Model::AttributeValue(logID));

  return this->innerFindItem<LogItem>(request);
}

std::vector<std::shared_ptr<LogItem>>
DatabaseManager::findLogItemsForBackup(const std::string &backupID) {
  std::vector<std::shared_ptr<database::LogItem>> result;
  std::shared_ptr<LogItem> item = createItemByType<LogItem>();

  Aws::DynamoDB::Model::QueryRequest req;
  req.SetTableName(LogItem::TABLE_NAME);
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

  return result;
}

void DatabaseManager::removeLogItem(std::shared_ptr<LogItem> item) {
  if (item == nullptr) {
    return;
  }
  this->innerRemoveItem(*item);
}

} // namespace database
} // namespace network
} // namespace comm
