#pragma once

#include "DatabaseEntitiesTools.h"
#include "DynamoDBTools.h"

#include <aws/core/Aws.h>
#include <aws/dynamodb/model/GetItemRequest.h>
#include <aws/dynamodb/model/PutItemRequest.h>

#include <memory>

namespace comm {
namespace network {
namespace database {

// this class should be thread-safe in case any shared resources appear
class DatabaseManagerBase {
protected:
  void innerPutItem(
      std::shared_ptr<Item> item,
      const Aws::DynamoDB::Model::PutItemRequest &request);

  template <typename T>
  std::shared_ptr<T>
  innerFindItem(Aws::DynamoDB::Model::GetItemRequest &request);

  void innerRemoveItem(const Item &item);
  void innerBatchWriteItem(
      const std::string &tableName,
      const size_t &chunkSize,
      const size_t &backoffFirstRetryDelay,
      const size_t &maxBackoffTime,
      std::vector<Aws::DynamoDB::Model::WriteRequest> &writeRequests);
};

template <typename T>
std::shared_ptr<T> DatabaseManagerBase::innerFindItem(
    Aws::DynamoDB::Model::GetItemRequest &request) {
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
  return item;
}

} // namespace database
} // namespace network
} // namespace comm
