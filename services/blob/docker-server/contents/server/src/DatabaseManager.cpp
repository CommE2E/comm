#include "DatabaseManager.h"

#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/DeleteItemRequest.h>
#include <aws/dynamodb/model/GetItemRequest.h>
#include <aws/dynamodb/model/QueryRequest.h>
#include <aws/dynamodb/model/UpdateItemRequest.h>
#include <aws/dynamodb/model/UpdateItemResult.h>

#include <iostream>

namespace comm {
namespace network {
namespace database {

DatabaseManager::DatabaseManager(const std::string blobTableName,
                                 const std::string reverseIndexTableName)
    : blobTableName(blobTableName),
      reverseIndexTableName(reverseIndexTableName) {
  Aws::Client::ClientConfiguration config;
  config.region = this->region;
  this->client = std::make_unique<Aws::DynamoDB::DynamoDBClient>(config);
}

void DatabaseManager::innerPutItem(
    std::shared_ptr<Item> item,
    const Aws::DynamoDB::Model::PutItemRequest &request) {
  item->validate();

  const Aws::DynamoDB::Model::PutItemOutcome outcome =
      this->client->PutItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
}

std::shared_ptr<Item>
DatabaseManager::innerFindItem(Aws::DynamoDB::Model::GetItemRequest &request,
                               const ItemType &itemType) {
  // Set up the request
  switch (itemType) {
  case ItemType::BLOB: {
    request.SetTableName(this->blobTableName);
    break;
  }
  case ItemType::REVERSE_INDEX: {
    request.SetTableName(this->reverseIndexTableName);
    break;
  }
  }
  // Retrieve the item's fields and values
  const Aws::DynamoDB::Model::GetItemOutcome &outcome =
      this->client->GetItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  const AttributeValues &outcomeItem = outcome.GetResult().GetItem();
  if (!outcomeItem.size()) {
    // todo print a hash here
    std::cout << "no item found for given hash" << std::endl;
    return nullptr;
  }

  switch (itemType) {
  case ItemType::BLOB: {
    return std::make_shared<BlobItem>(outcomeItem);
  }
  case ItemType::REVERSE_INDEX: {
    return std::make_shared<ReverseIndexItem>(outcomeItem);
  }
  }
  return nullptr;
}

void DatabaseManager::innerRemoveItem(const std::string &hash,
                                      const ItemType &itemType) {
  Aws::DynamoDB::Model::DeleteItemRequest request;

  // I couldn't avoid DRY here as those requests inherit from DynamoDBRequest
  // and that class does not have a method `SetTableName`
  switch (itemType) {
  case ItemType::BLOB: {
    request.SetTableName(this->blobTableName);
    break;
  }
  case ItemType::REVERSE_INDEX: {
    request.SetTableName(this->reverseIndexTableName);
    break;
  }
  }
  request.AddKey("hash", Aws::DynamoDB::Model::AttributeValue(hash));

  const Aws::DynamoDB::Model::DeleteItemOutcome &outcome =
      this->client->DeleteItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
}

void DatabaseManager::putBlobItem(const BlobItem &item) {
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(this->blobTableName);
  request.AddItem("hash", Aws::DynamoDB::Model::AttributeValue(item.hash));
  request.AddItem("s3Path", Aws::DynamoDB::Model::AttributeValue(
                                item.s3Path.getFullPath()));
  request.AddItem("removeCandidate", Aws::DynamoDB::Model::AttributeValue(
                                         std::to_string(item.removeCandidate)));

  this->innerPutItem(std::make_shared<BlobItem>(item), request);
}

std::shared_ptr<Item> DatabaseManager::findBlobItem(const std::string &hash) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey("hash", Aws::DynamoDB::Model::AttributeValue(hash));

  return this->innerFindItem(request, ItemType::BLOB);
}

void DatabaseManager::removeBlobItem(const std::string &hash) {
  this->innerRemoveItem(hash, ItemType::BLOB);
}

void DatabaseManager::updateBlobItem(const std::string &hash,
                                     const std::string &key,
                                     const std::string &newValue) {
  Aws::DynamoDB::Model::UpdateItemRequest request;
  request.SetTableName(this->blobTableName);

  request.AddKey("hash", Aws::DynamoDB::Model::AttributeValue(hash));

  // Construct the SET update expression argument.
  request.SetUpdateExpression(Aws::String("SET #key = :newValue"));

  // Construct attribute name argument
  // Note: Setting the ExpressionAttributeNames argument is required only
  // when the name is a reserved word, such as "default". Otherwise, the
  // name can be included in the update_expression, as in
  // "SET MyAttributeName = :valueA"
  Aws::Map<Aws::String, Aws::String> expressionAttributeNames;
  expressionAttributeNames["#key"] = key;
  request.SetExpressionAttributeNames(expressionAttributeNames);

  // Construct attribute value argument.
  Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue>
      expressionAttributeValues;
  expressionAttributeValues[":newValue"] =
      Aws::DynamoDB::Model::AttributeValue(newValue);
  request.SetExpressionAttributeValues(expressionAttributeValues);

  // Update the item.
  const Aws::DynamoDB::Model::UpdateItemOutcome &outcome =
      this->client->UpdateItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  std::cout << "Item was updated" << std::endl;
}

void DatabaseManager::putReverseIndexItem(const ReverseIndexItem &item) {
  if (this->findReverseIndexItemByReverseIndex(item.reverseIndex) != nullptr) {
    std::string errorMessage = "An item for the given reverse index [";
    errorMessage += item.reverseIndex;
    errorMessage += "] already exists";
    throw std::runtime_error(errorMessage);
  }
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(this->reverseIndexTableName);
  request.AddItem("hash", Aws::DynamoDB::Model::AttributeValue(item.hash));
  request.AddItem("reverseIndex",
                  Aws::DynamoDB::Model::AttributeValue(item.reverseIndex));

  this->innerPutItem(std::make_shared<ReverseIndexItem>(item), request);
}

std::shared_ptr<Item>
DatabaseManager::findReverseIndexItemByHash(const std::string &hash) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey("hash", Aws::DynamoDB::Model::AttributeValue(hash));

  return this->innerFindItem(request, ItemType::REVERSE_INDEX);
}

std::shared_ptr<Item> DatabaseManager::findReverseIndexItemByReverseIndex(
    const std::string &reverseIndex) {
  Aws::DynamoDB::Model::QueryRequest req;
  req.SetTableName(this->reverseIndexTableName);
  req.SetKeyConditionExpression("reverseIndex = :valueToMatch");

  AttributeValues attributeValues;
  attributeValues.emplace(":valueToMatch", reverseIndex);

  req.SetExpressionAttributeValues(attributeValues);
  req.SetIndexName("reverseIndex-index");

  const Aws::DynamoDB::Model::QueryOutcome &outcome = this->client->Query(req);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  const Aws::Vector<AttributeValues> &items = outcome.GetResult().GetItems();
  if (!items.size()) {
    return nullptr;
  }
  if (items.size() > 1) {
    throw std::runtime_error("more than one item found for this reverse index, "
                             "that should never happen");
  }
  AttributeValues outcomeItem = items.at(0);

  return std::make_shared<ReverseIndexItem>(outcomeItem);
}

void DatabaseManager::removeReverseIndexItem(const std::string &hash) {
  this->innerRemoveItem(hash, ItemType::REVERSE_INDEX);
}

} // namespace database
} // namespace network
} // namespace comm
