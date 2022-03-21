#pragma once

#include "AwsS3Bucket.h"

#include <chrono>
#include <string>

namespace comm {
namespace network {

std::string generateObjectName();
std::string createObject(AwsS3Bucket bucket);

} // namespace network
} // namespace comm
