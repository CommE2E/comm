#pragma once

#include <aws/core/Aws.h>
#include <aws/dynamodb/DynamoDBClient.h>

#include <memory>
#include <string>

namespace comm {
namespace network {
namespace database {

typedef Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue>
    AttributeValues;

struct PrimaryKeyBase {
  PrimaryKeyBase(const std::string partitionKey)
      : partitionKey(partitionKey), sortKey(nullptr) {
  }
  PrimaryKeyBase(const std::string partitionKey, const std::string sortKey)
      : partitionKey(partitionKey),
        sortKey(std::make_unique<std::string>(sortKey)) {
  }

  const std::string partitionKey;
  std::unique_ptr<std::string> sortKey;
};

struct PrimaryKey : PrimaryKeyBase {
  using PrimaryKeyBase::PrimaryKeyBase;
};

struct PrimaryKeyValue : PrimaryKeyBase {
  using PrimaryKeyBase::PrimaryKeyBase;
};

class Item {
  virtual void validate() const = 0;

public:
  virtual std::string getTableName() const = 0;
  virtual PrimaryKey getPrimaryKey() const = 0;
  virtual PrimaryKeyValue getPrimaryKeyValue() const = 0;
  virtual void assignItemFromDatabase(const AttributeValues &itemFromDB) = 0;
};

} // namespace database
} // namespace network
} // namespace comm
