#pragma once

#include "AwsS3Bucket.h"

#include <aws/core/Aws.h>
#include <aws/s3/S3Client.h>

#include <memory>
#include <string>
#include <vector>

namespace comm {
namespace network {

class AwsStorageManager {
  const std::string region = "us-east-2";
  std::shared_ptr<Aws::S3::S3Client> client;

public:
  AwsStorageManager();
  AwsS3Bucket getBucket(const std::string &bucketName);
  std::vector<std::string> listBuckets();
  std::shared_ptr<Aws::S3::S3Client> getClient() const;
};

} // namespace network
} // namespace comm
