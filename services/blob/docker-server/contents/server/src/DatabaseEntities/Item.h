#pragma once

#include <aws/core/Aws.h>
#include <aws/dynamodb/DynamoDBClient.h>

#include <string>

namespace comm {
namespace network {
namespace database {

typedef Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue>
    AttributeValues;

class Item {
  virtual void validate() const = 0;

public:
  virtual const std::string getTableName() const = 0;
  virtual const std::string getPrimaryKey() const = 0;
  virtual void assignItemFromDatabase(const AttributeValues &itemFromDB) = 0;
};

} // namespace database
} // namespace network
} // namespace comm
