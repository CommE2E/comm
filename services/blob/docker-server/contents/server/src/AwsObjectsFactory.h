#pragma once

#include <aws/core/Aws.h>
#include <aws/dynamodb/DynamoDBClient.h>
#include <aws/s3/S3Client.h>

#include <memory>
#include <string>

namespace comm {
namespace network {

/*
I created this class because I was experiencing crashes making calls to S3/DB
My guess is that the client classes are not thread safe so I went for frequent
spawning here. It may not be fully efficient but the important thing is that
it works with no crashes - it may not be that expensive though.
We could think of some "caching" here, like using threadlocal
So the objects aren't recreated all the time.
*/
class AwsObjectsFactory {
public:
  static std::shared_ptr<Aws::DynamoDB::DynamoDBClient> getDynamoDBClient() {
    const std::string region = "us-east-2";
    Aws::Client::ClientConfiguration config;
    config.region = region;
    return std::move(std::make_shared<Aws::DynamoDB::DynamoDBClient>(config));
  }

  static std::shared_ptr<Aws::S3::S3Client> getS3Client() {
    const std::string region = "us-east-2";
    Aws::Client::ClientConfiguration config;
    config.region = region;
    return std::move(std::make_shared<Aws::S3::S3Client>(config));
  }
};

} // namespace network
} // namespace comm
