#pragma once

#include <aws/core/Aws.h>
#include <aws/dynamodb/DynamoDBClient.h>
#include <aws/s3/S3Client.h>

#include <memory>
#include <string>

namespace comm {
namespace network {

const std::string AWS_REGION = "us-east-2";
const std::string BLOB_TABLE_NAME = "blob-service-blob";
const std::string REVERSE_INDEX_TABLE_NAME = "blob-service-reverse-index";
const std::string BLOB_BUCKET_NAME = "commapp-blob";

class AwsObjectsFactory {
public:
  static std::unique_ptr<Aws::DynamoDB::DynamoDBClient> getDynamoDBClient() {
    Aws::Client::ClientConfiguration config;
    config.region = AWS_REGION;
    return std::make_unique<Aws::DynamoDB::DynamoDBClient>(config);
  }

  static std::unique_ptr<Aws::S3::S3Client> getS3Client() {
    Aws::Client::ClientConfiguration config;
    config.region = AWS_REGION;
    return std::make_unique<Aws::S3::S3Client>(config);
  }
};

} // namespace network
} // namespace comm
