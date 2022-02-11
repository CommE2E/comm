#include "AwsTools.h"
#include "Constants.h"

namespace comm {
namespace network {

Aws::String getAwsRegion() {
  auto profileName = Aws::Auth::GetConfigProfileName();
  if (Aws::Config::HasCachedConfigProfile(profileName)) {
    auto profile = Aws::Config::GetCachedConfigProfile(profileName);
    Aws::String profileRegion = profile.GetRegion();
    if (!profileRegion.empty()) {
      return profileRegion;
    }
  }
  return {};
}

std::unique_ptr<Aws::DynamoDB::DynamoDBClient> getDynamoDBClient() {
  Aws::Client::ClientConfiguration config;
  config.region = getAwsRegion();
  if (config.region.empty()) {
    throw std::runtime_error(
        "Error: AWS region is not provided in the ~/.aws/config");
  }
  return std::make_unique<Aws::DynamoDB::DynamoDBClient>(config);
}

} // namespace network
} // namespace comm
