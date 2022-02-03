#include "DatabaseManager.h"
#include "Constants.h"

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

void DatabaseManager::putUserPersistItem(const UserPersistItem &item) {
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(UserPersistItem::tableName);
  request.AddItem(
      UserPersistItem::FIELD_USER_ID,
      Aws::DynamoDB::Model::AttributeValue(item.getUserID()));
  request.AddItem(
      UserPersistItem::FIELD_BACKUP_IDS,
      Aws::DynamoDB::Model::AttributeValue(item.getBackupIDs()));
  request.AddItem(
      UserPersistItem::FIELD_RECOVERY_DATA,
      Aws::DynamoDB::Model::AttributeValue(item.getRecoveryData()));

  this->innerPutItem(std::make_shared<UserPersistItem>(item), request);
}

std::shared_ptr<UserPersistItem>
DatabaseManager::findUserPersistItem(const std::string &userID) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      UserPersistItem::FIELD_USER_ID,
      Aws::DynamoDB::Model::AttributeValue(userID));
  return std::move(this->innerFindItem<UserPersistItem>(request));
}

void DatabaseManager::removeUserPersistItem(const std::string &userID) {
  this->innerRemoveItem(*(createItemByType<UserPersistItem>()), userID);
}

} // namespace database
} // namespace network
} // namespace comm
