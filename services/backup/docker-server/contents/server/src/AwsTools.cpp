#include "AwsTools.h"
#include "Constants.h"

namespace comm {
namespace network {

std::unique_ptr<Aws::DynamoDB::DynamoDBClient> getDynamoDBClient() {
  Aws::Client::ClientConfiguration config;
  config.region = AWS_REGION;
  return std::make_unique<Aws::DynamoDB::DynamoDBClient>(config);
}

} // namespace network
} // namespace comm
