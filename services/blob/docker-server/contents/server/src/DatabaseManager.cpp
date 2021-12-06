#include "DatabaseManager.h"

#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/AttributeDefinition.h>
#include <aws/dynamodb/model/DeleteItemRequest.h>
#include <aws/dynamodb/model/GetItemRequest.h>
#include <aws/dynamodb/model/PutItemRequest.h>

#include <iostream>

namespace comm {
namespace network {

DatabaseManager::DatabaseManager() {
  Aws::Client::ClientConfiguration config;
  config.region = this->region;
  this->client = std::make_unique<Aws::DynamoDB::DynamoDBClient>(config);
}

void DatabaseManager::putItem(const Item &item) {
  item.validate();

  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(this->tableName);
  request.AddItem("hash", Aws::DynamoDB::Model::AttributeValue(item.hash));
  request.AddItem("reverseIndex",
                  Aws::DynamoDB::Model::AttributeValue(item.reverseIndex));
  request.AddItem("s3Path", Aws::DynamoDB::Model::AttributeValue(item.s3Path));

  const Aws::DynamoDB::Model::PutItemOutcome outcome =
      this->client->PutItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
}

Item DatabaseManager::findItem(const std::string &hash) {
  Aws::DynamoDB::Model::GetItemRequest request;

  // Set up the request
  request.SetTableName(this->tableName);
  request.AddKey("hash", Aws::DynamoDB::Model::AttributeValue(hash));

  // Retrieve the item's fields and values
  const Aws::DynamoDB::Model::GetItemOutcome &outcome =
      this->client->GetItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  const Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue> &item =
      outcome.GetResult().GetItem();
  if (item.size() == 0) {
    std::cout << "no item found for hash " << hash << std::endl;
  }
  // Output each retrieved field and its value
  for (const auto &i : item) {
    std::cout << i.first << ": " << i.second.GetS() << std::endl;
  }

  Item result;
  return result; // todo fix this
}

void DatabaseManager::removeItem(const std::string &hash) {
  Aws::DynamoDB::Model::DeleteItemRequest request;

  request.SetTableName(this->tableName);
  request.AddKey("hash", Aws::DynamoDB::Model::AttributeValue(hash));

  const Aws::DynamoDB::Model::DeleteItemOutcome &outcome =
      this->client->DeleteItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
}

} // namespace network
} // namespace comm
