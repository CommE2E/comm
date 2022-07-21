#pragma once

#include "Constants.h"
#include "DeliveryBrokerEntites.h"

#include <folly/concurrency/ConcurrentHashMap.h>

#include <string>

namespace comm {
namespace network {

class DeliveryBroker {

  folly::ConcurrentHashMap<std::string, std::unique_ptr<DeliveryBrokerQueue>>
      messagesMap;

public:
  static DeliveryBroker &getInstance();
  void push(
      const std::string messageID,
      const uint64_t deliveryTag,
      const std::string toDeviceID,
      const std::string fromDeviceID,
      const std::string payload);
  bool isEmpty(const std::string deviceID);
  DeliveryBrokerMessage pop(const std::string deviceID);
  void erase(const std::string deviceID);
  void deleteQueueIfEmpty(const std::string clientDeviceID);
};

} // namespace network
} // namespace comm
