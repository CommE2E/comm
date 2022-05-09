#include "DatabaseManagerBase.h"

#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/DeleteItemRequest.h>

#include <iostream>

namespace comm {
namespace network {
namespace database {

void DatabaseManagerBase::innerPutItem(
    std::shared_ptr<Item> item,
    const Aws::DynamoDB::Model::PutItemRequest &request) {
  const Aws::DynamoDB::Model::PutItemOutcome outcome =
      getDynamoDBClient()->PutItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
}

void DatabaseManagerBase::innerRemoveItem(const Item &item) {
  Aws::DynamoDB::Model::DeleteItemRequest request;
  request.SetTableName(item.getTableName());
  PrimaryKey pk = item.getPrimaryKey();
  PrimaryKeyValue primaryKeyValue = item.getPrimaryKeyValue();
  request.AddKey(
      pk.partitionKey,
      Aws::DynamoDB::Model::AttributeValue(primaryKeyValue.partitionKey));
  if (pk.sortKey != nullptr && primaryKeyValue.sortKey != nullptr) {
    request.AddKey(
        *pk.sortKey,
        Aws::DynamoDB::Model::AttributeValue(*primaryKeyValue.sortKey));
  }

  const Aws::DynamoDB::Model::DeleteItemOutcome &outcome =
      getDynamoDBClient()->DeleteItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
}

} // namespace database
} // namespace network
} // namespace comm
