#pragma once

#include "DatabaseEntities.h"

#include <aws/core/Aws.h>
#include <aws/dynamodb/model/AttributeDefinition.h>
#include <aws/dynamodb/model/PutItemRequest.h>

#include <memory>
#include <stdexcept>
#include <string>

namespace comm {
namespace network {
namespace database {

typedef Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue>
    AttributeValues;

class DatabaseManager {
  const std::string blobTableName;
  const std::string reverseIndexTableName;

  void innerPutItem(std::shared_ptr<Item> item,
                    const Aws::DynamoDB::Model::PutItemRequest &request);
  std::shared_ptr<Item>
  innerFindItem(Aws::DynamoDB::Model::GetItemRequest &request,
                const ItemType &itemType);
  void innerRemoveItem(const std::string &hash, const ItemType &itemType);

public:
  DatabaseManager(const std::string blobTableName,
                  const std::string reverseIndexTableName);

  void putBlobItem(const BlobItem &item);
  std::shared_ptr<Item> findBlobItem(const std::string &hash);
  void removeBlobItem(const std::string &hash);
  void updateBlobItem(const std::string &hash, const std::string &key,
                      const std::string &newValue);

  void putReverseIndexItem(const ReverseIndexItem &item);
  std::shared_ptr<Item> findReverseIndexItemByHash(const std::string &hash);
  std::shared_ptr<Item>
  findReverseIndexItemByReverseIndex(const std::string &reverseIndex);
  void removeReverseIndexItem(const std::string &hash);
};

} // namespace database
} // namespace network
} // namespace comm
