#include "AwsTools.h"
#include "Constants.h"

namespace comm {
namespace network {

std::unique_ptr<Aws::DynamoDB::DynamoDBClient> getDynamoDBClient() {
  Aws::Client::ClientConfiguration config;
  config.region = AWS_REGION;
#ifdef COMM_SERVICES_DEV_MODE
  config.endpointOverride = Aws::String("localstack:4566");
  config.scheme = Aws::Http::Scheme::HTTP;
#endif
  return std::make_unique<Aws::DynamoDB::DynamoDBClient>(config);
}

} // namespace network
} // namespace comm
