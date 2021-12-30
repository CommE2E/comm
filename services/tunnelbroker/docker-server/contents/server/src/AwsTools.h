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
const std::string DEVICES_TABLE_NAME = "tunnelbroker-service-devices";

struct DynamoDBClientWrapper {
  std::shared_ptr<Aws::DynamoDB::DynamoDBClient> client;
  DynamoDBClientWrapper() {
    Aws::Client::ClientConfiguration config;
    config.region = AWS_REGION;
    client = std::make_shared<Aws::DynamoDB::DynamoDBClient>(config);
  }
};

class AwsObjectsFactory {
public:
  static std::shared_ptr<Aws::DynamoDB::DynamoDBClient> getDynamoDBClient() {
    thread_local std::unique_ptr<DynamoDBClientWrapper> clientWrapper =
        std::make_unique<DynamoDBClientWrapper>();
    return clientWrapper->client;
  }
};

} // namespace network
} // namespace comm