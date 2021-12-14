#include "DatabaseManager.h"
#include "AwsObjectsFactory.h"

#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/DeleteItemRequest.h>
#include <aws/dynamodb/model/GetItemRequest.h>
#include <aws/dynamodb/model/QueryRequest.h>
#include <aws/dynamodb/model/ScanRequest.h>
#include <aws/dynamodb/model/UpdateItemRequest.h>
#include <aws/dynamodb/model/UpdateItemResult.h>

#include <iostream>
#include <vector>

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
  item->validate();

  const Aws::DynamoDB::Model::PutItemOutcome outcome =
      AwsObjectsFactory::getDynamoDBClient()->PutItem(request);
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
      AwsObjectsFactory::getDynamoDBClient()->GetItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  const AttributeValues &outcomeItem = outcome.GetResult().GetItem();
  if (!outcomeItem.size()) {
    // todo print a fileHash here
    std::cout << "no item found for given fileHash" << std::endl;
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

// the key is either
//  - fileHash for blob items
//  - reverseIndex for reverse index items
void DatabaseManager::innerRemoveItem(const std::string &key,
                                      const ItemType &itemType) {
  Aws::DynamoDB::Model::DeleteItemRequest request;

  // I couldn't avoid DRY here as those requests inherit from DynamoDBRequest
  // and that class does not have a method `SetTableName`
  switch (itemType) {
  case ItemType::BLOB: {
    request.SetTableName(this->blobTableName);
    request.AddKey("fileHash", Aws::DynamoDB::Model::AttributeValue(key));
    break;
  }
  case ItemType::REVERSE_INDEX: {
    request.SetTableName(this->reverseIndexTableName);
    request.AddKey("reverseIndex", Aws::DynamoDB::Model::AttributeValue(key));
    break;
  }
  }

  const Aws::DynamoDB::Model::DeleteItemOutcome &outcome =
      AwsObjectsFactory::getDynamoDBClient()->DeleteItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
}

void DatabaseManager::putBlobItem(const BlobItem &item) {
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(this->blobTableName);
  request.AddItem("fileHash",
                  Aws::DynamoDB::Model::AttributeValue(item.fileHash));
  request.AddItem("s3Path", Aws::DynamoDB::Model::AttributeValue(
                                item.s3Path.getFullPath()));
  request.AddItem("removeCandidate", Aws::DynamoDB::Model::AttributeValue(
                                         std::to_string(item.removeCandidate)));

  this->innerPutItem(std::make_shared<BlobItem>(item), request);
}

std::shared_ptr<Item>
DatabaseManager::findBlobItem(const std::string &fileHash) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey("fileHash", Aws::DynamoDB::Model::AttributeValue(fileHash));

  return this->innerFindItem(request, ItemType::BLOB);
}

void DatabaseManager::removeBlobItem(const std::string &fileHash) {
  this->innerRemoveItem(fileHash, ItemType::BLOB);
}

void DatabaseManager::updateBlobItem(const std::string &fileHash,
                                     const std::string &key,
                                     const std::string &newValue) {
  Aws::DynamoDB::Model::UpdateItemRequest request;
  request.SetTableName(this->blobTableName);

  request.AddKey("fileHash", Aws::DynamoDB::Model::AttributeValue(fileHash));

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
      AwsObjectsFactory::getDynamoDBClient()->UpdateItem(request);
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
  request.AddItem("reverseIndex",
                  Aws::DynamoDB::Model::AttributeValue(item.reverseIndex));
  request.AddItem("fileHash",
                  Aws::DynamoDB::Model::AttributeValue(item.fileHash));

  this->innerPutItem(std::make_shared<ReverseIndexItem>(item), request);
}

std::shared_ptr<Item> DatabaseManager::findReverseIndexItemByReverseIndex(
    const std::string &reverseIndex) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey("reverseIndex",
                 Aws::DynamoDB::Model::AttributeValue(reverseIndex));

  return this->innerFindItem(request, ItemType::REVERSE_INDEX);
}

std::vector<std::shared_ptr<database::ReverseIndexItem>>
DatabaseManager::findReverseIndexItemsByHash(const std::string &fileHash) {
  std::vector<std::shared_ptr<database::ReverseIndexItem>> result;

  Aws::DynamoDB::Model::QueryRequest req;
  req.SetTableName(this->reverseIndexTableName);
  req.SetKeyConditionExpression("fileHash = :valueToMatch");

  AttributeValues attributeValues;
  attributeValues.emplace(":valueToMatch", fileHash);

  req.SetExpressionAttributeValues(attributeValues);
  req.SetIndexName("fileHash-index");

  const Aws::DynamoDB::Model::QueryOutcome &outcome =
      AwsObjectsFactory::getDynamoDBClient()->Query(req);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  const Aws::Vector<AttributeValues> &items = outcome.GetResult().GetItems();
  for (auto &item : items) {
    result.push_back(std::make_shared<database::ReverseIndexItem>(item));
  }

  return result;
}

void DatabaseManager::removeReverseIndexItem(const std::string &reverseIndex) {
  std::shared_ptr<database::ReverseIndexItem> item =
      std::dynamic_pointer_cast<database::ReverseIndexItem>(
          findReverseIndexItemByReverseIndex(reverseIndex));
  if (item == nullptr) {
    throw std::runtime_error(std::string(
        "no reverse index item found for reverse index " + reverseIndex));
  }
  this->innerRemoveItem(item->reverseIndex, ItemType::REVERSE_INDEX);
}

// we should pay attention how this is going to scale
std::vector<std::string> DatabaseManager::getAllHashes() {
  Aws::DynamoDB::Model::ScanRequest req;
  req.SetTableName(this->blobTableName);

  std::vector<std::string> result;

  // Perform scan on table
  const Aws::DynamoDB::Model::ScanOutcome &outcome =
      AwsObjectsFactory::getDynamoDBClient()->Scan(req);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  // Reference the retrieved items
  const Aws::Vector<AttributeValues> &retreivedItems =
      outcome.GetResult().GetItems();
  // std::cout << "Number of items retrieved from scan: " << items.size() <<
  // std::endl;
  // Iterate each item and print
  for (const auto &retreivedItem : retreivedItems) {
    // std::cout << "******************************************************" <<
    // std::endl; Output each retrieved field and its value
    BlobItem item(retreivedItem);
    result.push_back(item.fileHash);
    // for (const auto &itemData : item) {
    //   // std::cout << i.first << ": " << i.second.GetS() << std::endl;
    //   if (itemData.first == "fileHash") {
    //     result.push_back(itemData.second.GetS());
    //   }
    // }
  }
  return result;
}

} // namespace database
} // namespace network
} // namespace comm
