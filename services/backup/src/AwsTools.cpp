#include "AwsTools.h"
#include "Constants.h"
#include "Tools.h"

#include <cstdlib>

namespace comm {
namespace network {

std::unique_ptr<Aws::DynamoDB::DynamoDBClient> getDynamoDBClient() {
  Aws::Client::ClientConfiguration config;
  config.region = AWS_REGION;
  if (isDevMode()) {
    config.endpointOverride = Aws::String("localstack:4566");
    config.scheme = Aws::Http::Scheme::HTTP;
  }
  return std::make_unique<Aws::DynamoDB::DynamoDBClient>(config);
}

} // namespace network
} // namespace comm
