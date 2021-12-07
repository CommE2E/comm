#pragma once

#include <aws/core/Aws.h>
#include <aws/dynamodb/DynamoDBClient.h>

#include <memory>
#include <stdexcept>
#include <string>

namespace comm {
namespace network {

struct Item {
  std::string hash;
  std::string reverseIndex;
  std::string s3Path;

  void validate() const {
    // todo consider more checks here for valid values
    if (!hash.size()) {
      throw std::runtime_error("hash empty");
    }
    if (!reverseIndex.size()) {
      throw std::runtime_error("reverse index empty");
    }
    if (!s3Path.size()) {
      throw std::runtime_error("S3 path empty");
    }
  }
};

class DatabaseManager {
  const std::string tableName;
  const std::string region = "us-east-2";
  std::unique_ptr<Aws::DynamoDB::DynamoDBClient> client;

public:
  DatabaseManager(const std::string tableName);
  void putItem(const Item &item);
  Item findItem(const std::string &hash);
  void removeItem(const std::string &hash);
};

} // namespace network
} // namespace comm
