#pragma once

#include <aws/core/Aws.h>
#include <aws/dynamodb/DynamoDBClient.h>

#include <memory>
#include <string>

namespace comm {
namespace network {

// TODO:
// Maybe we shoud put the credentials to the global
// AWS config file
const std::string AWS_REGION = "us-east-2";
const std::string DEVICE_SESSIONS_TABLE_NAME = "tunnelbroker-service-devices";

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