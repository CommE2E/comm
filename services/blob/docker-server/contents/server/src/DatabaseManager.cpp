#include "DatabaseManager.h"
#include "Tools.h"

#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/QueryRequest.h>
#include <aws/dynamodb/model/ScanRequest.h>

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
  const Aws::DynamoDB::Model::PutItemOutcome outcome =
      AwsObjectsFactory::getDynamoDBClient()->PutItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
}

void DatabaseManager::putBlobItem(const BlobItem &item) {
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(BlobItem::tableName);
  request.AddItem(
      BlobItem::FIELD_BLOB_HASH,
      Aws::DynamoDB::Model::AttributeValue(item.getBlobHash()));
  request.AddItem(
      BlobItem::FIELD_S3_PATH,
      Aws::DynamoDB::Model::AttributeValue(item.getS3Path().getFullPath()));
  request.AddItem(
      BlobItem::FIELD_CREATED,
      Aws::DynamoDB::Model::AttributeValue(
          std::to_string(Tools::getInstance().getCurrentTimestamp())));

  this->innerPutItem(std::make_shared<BlobItem>(item), request);
}

std::shared_ptr<BlobItem>
DatabaseManager::findBlobItem(const std::string &blobHash) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      BlobItem::FIELD_BLOB_HASH,
      Aws::DynamoDB::Model::AttributeValue(blobHash));
  return std::move(this->innerFindItem<BlobItem>(request));
}

void DatabaseManager::putReverseIndexItem(const ReverseIndexItem &item) {
  if (this->findReverseIndexItemByHolder(item.getHolder()) != nullptr) {
    std::string errorMessage = "An item for the given holder [";
    errorMessage += item.getHolder();
    errorMessage += "] already exists";
    throw std::runtime_error(errorMessage);
  }
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(ReverseIndexItem::tableName);
  request.AddItem(
      ReverseIndexItem::FIELD_HOLDER,
      Aws::DynamoDB::Model::AttributeValue(item.getHolder()));
  request.AddItem(
      ReverseIndexItem::FIELD_BLOB_HASH,
      Aws::DynamoDB::Model::AttributeValue(item.getBlobHash()));

  this->innerPutItem(std::make_shared<ReverseIndexItem>(item), request);
}

std::shared_ptr<ReverseIndexItem>
DatabaseManager::findReverseIndexItemByHolder(const std::string &holder) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      ReverseIndexItem::FIELD_HOLDER,
      Aws::DynamoDB::Model::AttributeValue(holder));

  return std::move(this->innerFindItem<ReverseIndexItem>(request));
}

} // namespace database
} // namespace network
} // namespace comm
