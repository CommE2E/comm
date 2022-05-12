#pragma once

#include <aws/core/Aws.h>
#include <aws/core/auth/AWSCredentialsProvider.h>
#include <aws/core/config/AWSProfileConfigLoader.h>
#include <aws/dynamodb/DynamoDBClient.h>

#include <memory>

namespace comm {
namespace network {

Aws::String getAwsRegion();

} // namespace network
} // namespace comm
