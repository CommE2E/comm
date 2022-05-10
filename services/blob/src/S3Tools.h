#pragma once

#include "AwsS3Bucket.h"
#include "Constants.h"

#include <aws/core/Aws.h>
#include <aws/dynamodb/DynamoDBClient.h>
#include <aws/s3/S3Client.h>

#include <memory>
#include <string>

namespace comm {
namespace network {

AwsS3Bucket getBucket(const std::string &bucketName);

std::vector<std::string> listBuckets();

std::unique_ptr<Aws::S3::S3Client> getS3Client();

} // namespace network
} // namespace comm
