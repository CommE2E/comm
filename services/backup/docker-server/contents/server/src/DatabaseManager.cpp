#include "DatabaseManager.h"
#include "Constants.h"
#include "Tools.h"

#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/DeleteItemRequest.h>
#include <aws/dynamodb/model/QueryRequest.h>
#include <aws/dynamodb/model/ScanRequest.h>

#include <iostream>

namespace comm {
namespace network {
namespace database {

DatabaseManager &DatabaseManager::getInstance() {
  static DatabaseManager instance;
  return instance;
}

void DatabaseManager::innerPutItem(
    std::shared_ptr<Item> item,
    const Aws::DynamoDB::Model::PutItemRequest &request) {
  const Aws::DynamoDB::Model::PutItemOutcome outcome =
      getDynamoDBClient()->PutItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
}

void DatabaseManager::innerRemoveItem(
    const Item &item,
    const std::string &key) {
  Aws::DynamoDB::Model::DeleteItemRequest request;
  request.SetTableName(item.getTableName());
  request.AddKey(
      item.getPrimaryKey(), Aws::DynamoDB::Model::AttributeValue(key));

  const Aws::DynamoDB::Model::DeleteItemOutcome &outcome =
      getDynamoDBClient()->DeleteItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
}

void DatabaseManager::putBackupItem(const BackupItem &item) {
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(BackupItem::tableName);
  request.AddItem(
      BackupItem::FIELD_USER_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getUserID()));
  request.AddItem(
      BackupItem::FIELD_CREATED,
      Aws::DynamoDB::Model::AttributeValue(
          std::to_string(getCurrentTimestamp())));
  request.AddItem(
      BackupItem::FIELD_BACKUP_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getBackupID()));
  request.AddItem(
      BackupItem::FIELD_RECOVERY_DATA,
      Aws::DynamoDB::Model::AttributeValue(item.getRecoveryData()));
  request.AddItem(
      BackupItem::FIELD_COMPACTION_HOLDER,
      Aws::DynamoDB::Model::AttributeValue(item.getCompactionHolder()));
  request.AddItem(
      BackupItem::FIELD_ATTACHMENT_HOLDERS,
      Aws::DynamoDB::Model::AttributeValue(item.getAttachmentHolders()));

  this->innerPutItem(std::make_shared<BackupItem>(item), request);
}

std::shared_ptr<BackupItem>
DatabaseManager::findLastBackupItem(const std::string &userID) {
  std::shared_ptr<BackupItem> item = createItemByType<BackupItem>();

  Aws::DynamoDB::Model::QueryRequest req;
  req.SetTableName(BackupItem::tableName);
  req.SetKeyConditionExpression(item->getPrimaryKey() + " = :valueToMatch");

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
  Aws::DynamoDB::Model::DeleteItemRequest request;
  request.SetTableName(item->getTableName());
  request.AddKey(
      BackupItem::FIELD_USER_ID,
      Aws::DynamoDB::Model::AttributeValue(item->getUserID()));
  request.AddKey(
      BackupItem::FIELD_BACKUP_ID,
      Aws::DynamoDB::Model::AttributeValue(item->getBackupID()));

  const Aws::DynamoDB::Model::DeleteItemOutcome &outcome =
      comm::network::getDynamoDBClient()->DeleteItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
}

} // namespace database
} // namespace network
} // namespace comm
