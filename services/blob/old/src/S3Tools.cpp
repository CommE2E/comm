#include "S3Tools.h"
#include "Constants.h"
#include "GlobalConstants.h"
#include "GlobalTools.h"
#include "Tools.h"

#include <aws/s3/model/Bucket.h>

#include <cstdlib>

namespace comm {
namespace network {

AwsS3Bucket getBucket(const std::string &bucketName) {
  return AwsS3Bucket(bucketName);
}

std::vector<std::string> listBuckets() {
  Aws::S3::Model::ListBucketsOutcome outcome = getS3Client()->ListBuckets();
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

std::unique_ptr<Aws::S3::S3Client> getS3Client() {
  Aws::Client::ClientConfiguration config;
  config.region = AWS_REGION;
  if (tools::isSandbox()) {
    config.endpointOverride = Aws::String("localstack:4566");
    config.scheme = Aws::Http::Scheme::HTTP;
    return std::make_unique<Aws::S3::S3Client>(
        config,
        Aws::Client::AWSAuthV4Signer::PayloadSigningPolicy::Never,
        false);
  }
  return std::make_unique<Aws::S3::S3Client>(config);
}

} // namespace network
} // namespace comm
