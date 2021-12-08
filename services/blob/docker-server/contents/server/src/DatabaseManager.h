#pragma once

#include "DatabaseEntities.h"

#include <aws/core/Aws.h>
#include <aws/dynamodb/DynamoDBClient.h>
#include <aws/dynamodb/model/PutItemRequest.h>

#include <memory>
#include <stdexcept>
#include <string>

namespace comm {
namespace network {

class DatabaseManager {
  const std::string blobTableName;
  const std::string reverseIndexTableName;
  const std::string region = "us-east-2";
  std::unique_ptr<Aws::DynamoDB::DynamoDBClient> client;

  void innerPutItem(std::shared_ptr<Item> item,
                    const Aws::DynamoDB::Model::PutItemRequest &request);
  std::shared_ptr<Item> innerFindItem(const std::string &hash,
                                      const ItemType &itemType);
  void innerRemoveItem(const std::string &hash, const ItemType &itemType);

public:
  DatabaseManager(const std::string blobTableName,
                  const std::string reverseIndexTableName);

  void putBlobItem(const BlobItem &item);
  std::shared_ptr<Item> findBlobItem(const std::string &hash);
  void removeBlobItem(const std::string &hash);

  void putReverseIndexItem(const ReverseIndexItem &item);
  std::shared_ptr<Item> findReverseIndexItem(const std::string &hash);
  void removeReverseIndexItem(const std::string &hash);
};

} // namespace network
} // namespace comm
