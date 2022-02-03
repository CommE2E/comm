#pragma once

#include "AwsTools.h"
#include "DatabaseEntitiesTools.h"

#include <aws/core/Aws.h>
#include <aws/dynamodb/model/AttributeDefinition.h>
#include <aws/dynamodb/model/GetItemRequest.h>
#include <aws/dynamodb/model/PutItemRequest.h>

#include <memory>
#include <string>

#ifdef COMM_SERVICES_DEV_MODE
#include "DatabaseSimulator.h"
#endif

namespace comm {
namespace network {
namespace database {

// this class should be thread-safe in case any shared resources appear
class DatabaseManager {
#ifdef COMM_SERVICES_DEV_MODE
  DatabaseSimulator dbSimulator;
#endif

  void innerPutItem(
      std::shared_ptr<Item> item,
      const Aws::DynamoDB::Model::PutItemRequest &request);

  template <typename T>
  std::shared_ptr<T>
  innerFindItem(Aws::DynamoDB::Model::GetItemRequest &request);
  void innerRemoveItem(const Item &item, const std::string &key);

public:
  static DatabaseManager &getInstance();

  void putUserPersistItem(const UserPersistItem &item);
  std::shared_ptr<UserPersistItem>
  findUserPersistItem(const std::string &userID);
  void removeUserPersistItem(const std::string &userID);

  void putBackupItem(const BackupItem &item);
  std::shared_ptr<BackupItem> findBackupItem(const std::string &id);
  void removeBackupItem(const std::string &id);
};

template <typename T>
std::shared_ptr<T>
DatabaseManager::innerFindItem(Aws::DynamoDB::Model::GetItemRequest &request) {
  std::shared_ptr<T> item = createItemByType<T>();
  request.SetTableName(item->getTableName());
  const Aws::DynamoDB::Model::GetItemOutcome &outcome =
      getDynamoDBClient()->GetItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  const AttributeValues &outcomeItem = outcome.GetResult().GetItem();
  if (!outcomeItem.size()) {
    return nullptr;
  }
  item->assignItemFromDatabase(outcomeItem);
  return std::move(item);
}

} // namespace database
} // namespace network
} // namespace comm
