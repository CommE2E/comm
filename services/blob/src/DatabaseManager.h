#pragma once

#include "BlobItem.h"
#include "DatabaseEntitiesTools.h"
#include "DatabaseManagerBase.h"
#include "DynamoDBTools.h"
#include "ReverseIndexItem.h"

#include <aws/core/Aws.h>
#include <aws/dynamodb/model/AttributeDefinition.h>
#include <aws/dynamodb/model/DeleteItemRequest.h>
#include <aws/dynamodb/model/GetItemRequest.h>
#include <aws/dynamodb/model/PutItemRequest.h>

#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

namespace comm {
namespace network {
namespace database {

// this class should be thread-safe in case any shared resources appear
class DatabaseManager : public DatabaseManagerBase {
public:
  static DatabaseManager &getInstance();

  void putBlobItem(const BlobItem &item);
  std::shared_ptr<BlobItem> findBlobItem(const std::string &blobHash);
  void removeBlobItem(const std::string &blobHash);

  void putReverseIndexItem(const ReverseIndexItem &item);
  std::shared_ptr<ReverseIndexItem>
  findReverseIndexItemByHolder(const std::string &holder);
  std::vector<std::shared_ptr<database::ReverseIndexItem>>
  findReverseIndexItemsByHash(const std::string &blobHash);
  void removeReverseIndexItem(const std::string &holder);
};

} // namespace database
} // namespace network
} // namespace comm
