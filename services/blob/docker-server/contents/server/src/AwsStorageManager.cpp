#include "AwsStorageManager.h"
#include "AwsObjectsFactory.h"
#include "Tools.h"

#include <aws/s3/model/Bucket.h>

namespace comm {
namespace network {

AwsS3Bucket AwsStorageManager::getBucket(const std::string &bucketName) {
  return AwsS3Bucket(bucketName);
}

std::vector<std::string> AwsStorageManager::listBuckets() {
  Aws::S3::Model::ListBucketsOutcome outcome =
      AwsObjectsFactory::getS3Client()->ListBuckets();
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
