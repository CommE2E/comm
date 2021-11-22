#include "AwsStorageManager.h"

#include "Tools.h"

#include <aws/s3/model/Bucket.h>

namespace comm {
namespace network {

AwsStorageManager::AwsStorageManager() {
  Aws::Client::ClientConfiguration config;
  config.region = this->region;
  this->client = std::make_shared<Aws::S3::S3Client>(config);
}

AwsS3Bucket AwsStorageManager::getBucket(const std::string &bucketName) {
  return AwsS3Bucket(bucketName, this->client);
}

std::vector<std::string> AwsStorageManager::listBuckets() {
  Aws::S3::Model::ListBucketsOutcome outcome = this->client->ListBuckets();
  std::vector<std::string> result;
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  Aws::Vector<Aws::S3::Model::Bucket> buckets =
      outcome.GetResult().GetBuckets();
  for (Aws::S3::Model::Bucket &bucket : buckets) {
    result.push_back(bucket.GetName());
  }
  return result;
}

} // namespace network
} // namespace comm
