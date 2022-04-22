#pragma once

#include <aws/core/Aws.h>
#include <aws/dynamodb/DynamoDBClient.h>

#include <memory>

namespace comm {
namespace network {

std::unique_ptr<Aws::DynamoDB::DynamoDBClient> getDynamoDBClient();

} // namespace network
} // namespace comm
