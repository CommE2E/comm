#pragma once

#include "Constants.h"
#include <aws/core/Aws.h>
#include <aws/dynamodb/DynamoDBClient.h>

#include <memory>
#include <string>

namespace comm {
namespace network {

class AwsObjectsFactory {
public:
  static std::unique_ptr<Aws::DynamoDB::DynamoDBClient> getDynamoDBClient() {
    Aws::Client::ClientConfiguration config;
    config.region = AWS_REGION;
    return std::make_unique<Aws::DynamoDB::DynamoDBClient>(config);
  }
};

} // namespace network
} // namespace comm
