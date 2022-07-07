#include "DynamoDBTools.h"
#include "GlobalConstants.h"
#include "GlobalTools.h"

namespace comm {
namespace network {

std::unique_ptr<Aws::DynamoDB::DynamoDBClient> getDynamoDBClient() {
  Aws::Client::ClientConfiguration config;
  config.region = AWS_REGION;
  if (tools::isSandbox()) {
    config.endpointOverride = Aws::String("localstack:4566");
    config.scheme = Aws::Http::Scheme::HTTP;
  }
  return std::make_unique<Aws::DynamoDB::DynamoDBClient>(config);
}

} // namespace network
} // namespace comm
