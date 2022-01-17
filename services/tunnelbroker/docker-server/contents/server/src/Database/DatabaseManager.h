#pragma once

#include "AwsTools.h"
#include "DatabaseEntitiesTools.h"
#include "DeviceSessionItem.h"
#include "Tools.h"

#include <aws/core/Aws.h>
#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/AttributeDefinition.h>
#include <aws/dynamodb/model/GetItemRequest.h>
#include <aws/dynamodb/model/PutItemRequest.h>
#include <aws/dynamodb/model/QueryRequest.h>
#include <aws/dynamodb/model/ScanRequest.h>

#include <iostream>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

namespace comm {
namespace network {
namespace database {

class DatabaseManager {

  void innerPutItem(
      std::shared_ptr<Item> item,
      const Aws::DynamoDB::Model::PutItemRequest &request);

  template <typename T>
  std::shared_ptr<T>
  innerFindItem(Aws::DynamoDB::Model::GetItemRequest &request);

public:
  static DatabaseManager &getInstance();
  void putSessionItem(const DeviceSessionItem &item);
  std::shared_ptr<DeviceSessionItem>
  findSessionItem(const std::string &deviceID);
};

template <typename T>
std::shared_ptr<T>
DatabaseManager::innerFindItem(Aws::DynamoDB::Model::GetItemRequest &request) {
  std::shared_ptr<T> item = createItemByType<T>();
  request.SetTableName(item->getTableName());
  const Aws::DynamoDB::Model::GetItemOutcome &outcome =
      AwsObjectsFactory::getDynamoDBClient()->GetItem(request);
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
