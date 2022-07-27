#include "DatabaseManager.h"
#include "GlobalTools.h"
#include "Tools.h"

#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/QueryRequest.h>
#include <aws/dynamodb/model/ScanRequest.h>

#include <glog/logging.h>

#include <vector>

namespace comm {
namespace network {
namespace database {

DatabaseManager &DatabaseManager::getInstance() {
  static DatabaseManager instance;
  return instance;
}

void DatabaseManager::putBlobItem(const BlobItem &item) {
  LOG(INFO) << "[DatabaseManager::putBlobItem] blob hash "
            << item.getBlobHash();
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
          std::to_string(tools::getCurrentTimestamp())));

  this->innerPutItem(std::make_shared<BlobItem>(item), request);
}

std::shared_ptr<BlobItem>
DatabaseManager::findBlobItem(const std::string &blobHash) {
  LOG(INFO) << "[DatabaseManager::findBlobItem] blob hash " << blobHash;
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      BlobItem::FIELD_BLOB_HASH,
      Aws::DynamoDB::Model::AttributeValue(blobHash));
  return std::move(this->innerFindItem<BlobItem>(request));
}

void DatabaseManager::removeBlobItem(const std::string &blobHash) {
  LOG(INFO) << "[DatabaseManager::removeBlobItem] blob hash " << blobHash;
  std::shared_ptr<BlobItem> item = this->findBlobItem(blobHash);
  if (item == nullptr) {
    return;
  }
  this->innerRemoveItem(*item);
}

void DatabaseManager::putReverseIndexItem(const ReverseIndexItem &item) {
  LOG(INFO) << "[DatabaseManager::putReverseIndexItem] holder "
            << item.getHolder();
  if (this->findReverseIndexItemByHolder(item.getHolder()) != nullptr) {
    throw std::runtime_error(
        "An item for the given holder [" + item.getHolder() +
        "] already exists");
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
  LOG(INFO) << "[DatabaseManager::findReverseIndexItemByHolder] holder "
            << holder;
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      ReverseIndexItem::FIELD_HOLDER,
      Aws::DynamoDB::Model::AttributeValue(holder));

  return std::move(this->innerFindItem<ReverseIndexItem>(request));
}

std::vector<std::shared_ptr<database::ReverseIndexItem>>
DatabaseManager::findReverseIndexItemsByHash(const std::string &blobHash) {
  LOG(INFO) << "[DatabaseManager::findReverseIndexItemsByHash] hash "
            << blobHash;
  std::vector<std::shared_ptr<database::ReverseIndexItem>> result;

  Aws::DynamoDB::Model::QueryRequest req;
  req.SetTableName(ReverseIndexItem::tableName);
  req.SetKeyConditionExpression("blobHash = :valueToMatch");

  AttributeValues attributeValues;
  attributeValues.emplace(":valueToMatch", blobHash);

  req.SetExpressionAttributeValues(attributeValues);
  req.SetIndexName("blobHash-index");

  const Aws::DynamoDB::Model::QueryOutcome &outcome =
      getDynamoDBClient()->Query(req);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  const Aws::Vector<AttributeValues> &items = outcome.GetResult().GetItems();
  for (auto &item : items) {
    result.push_back(std::make_shared<database::ReverseIndexItem>(item));
  }

  return result;
}

void DatabaseManager::removeReverseIndexItem(const std::string &holder) {
  LOG(INFO) << "[DatabaseManager::removeReverseIndexItem] holder " << holder;
  std::shared_ptr<database::ReverseIndexItem> item =
      findReverseIndexItemByHolder(holder);
  if (item == nullptr) {
    return;
  }
  this->innerRemoveItem(*item);
}

} // namespace database
} // namespace network
} // namespace comm
