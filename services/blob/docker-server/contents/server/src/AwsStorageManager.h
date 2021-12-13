#pragma once

#include "AwsS3Bucket.h"

#include <aws/core/Aws.h>

#include <memory>
#include <string>
#include <vector>

namespace comm {
namespace network {

class AwsStorageManager {
public:
  AwsS3Bucket getBucket(const std::string &bucketName);
  std::vector<std::string> listBuckets();
};

} // namespace network
} // namespace comm
