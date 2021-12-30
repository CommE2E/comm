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
public:
  virtual void assignItemFromDatabase(const AttributeValues &itemFromDB) = 0;
};

} // namespace database
} // namespace network
} // namespace comm