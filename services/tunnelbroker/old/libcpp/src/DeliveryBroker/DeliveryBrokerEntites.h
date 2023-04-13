#pragma once

#include <folly/MPMCQueue.h>

#include <string>
#include <vector>

namespace comm {
namespace network {

struct DeliveryBrokerMessage {
  std::string messageID;
  uint64_t deliveryTag;
  std::string fromDeviceID;
  std::string payload;
  std::vector<std::string> blobHashes;
};

typedef folly::MPMCQueue<DeliveryBrokerMessage> DeliveryBrokerQueue;

} // namespace network
} // namespace comm
