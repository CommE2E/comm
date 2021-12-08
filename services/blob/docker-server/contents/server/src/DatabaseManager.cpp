#include "DatabaseManager.h"

#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/AttributeDefinition.h>
#include <aws/dynamodb/model/DeleteItemRequest.h>
#include <aws/dynamodb/model/GetItemRequest.h>

#include <iostream>

namespace comm {
namespace network {

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

std::shared_ptr<Item> DatabaseManager::innerFindItem(const std::string &hash,
                                                     const ItemType &itemType) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey("hash", Aws::DynamoDB::Model::AttributeValue(hash));

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
  const Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue>
      &outcomeItem = outcome.GetResult().GetItem();
  if (outcomeItem.size() == 0) {
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
  request.AddItem("s3Path", Aws::DynamoDB::Model::AttributeValue(item.s3Path));
  request.AddItem("removeCandidate", Aws::DynamoDB::Model::AttributeValue(
                                         std::to_string(item.removeCandidate)));

  this->innerPutItem(std::make_shared<BlobItem>(item), request);
}

std::shared_ptr<Item> DatabaseManager::findBlobItem(const std::string &hash) {
  return this->innerFindItem(hash, ItemType::BLOB);
}

void DatabaseManager::removeBlobItem(const std::string &hash) {
  this->innerRemoveItem(hash, ItemType::BLOB);
}

void DatabaseManager::putReverseIndexItem(const ReverseIndexItem &item) {
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(this->reverseIndexTableName);
  request.AddItem("hash", Aws::DynamoDB::Model::AttributeValue(item.hash));
  request.AddItem("reverseIndex",
                  Aws::DynamoDB::Model::AttributeValue(item.reverseIndex));

  this->innerPutItem(std::make_shared<ReverseIndexItem>(item), request);
}

std::shared_ptr<Item>
DatabaseManager::findReverseIndexItem(const std::string &hash) {
  return this->innerFindItem(hash, ItemType::REVERSE_INDEX);
}

void DatabaseManager::removeReverseIndexItem(const std::string &hash) {
  this->innerRemoveItem(hash, ItemType::REVERSE_INDEX);
}

} // namespace network
} // namespace comm
