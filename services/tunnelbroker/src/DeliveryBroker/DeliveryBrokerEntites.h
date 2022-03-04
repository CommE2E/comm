#pragma once

#include <string>
#include <vector>

namespace comm {
namespace network {

struct DeliveryBrokerMessage {
  uint64_t deliveryTag;
  std::string fromDeviceID;
  std::string payload;
  std::vector<std::string> blobHashes;
};

} // namespace network
} // namespace comm
