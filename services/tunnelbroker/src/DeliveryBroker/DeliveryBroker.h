#pragma once

#include "Constants.h"
#include "DeliveryBrokerEntites.h"

#include <folly/concurrency/ConcurrentHashMap.h>

#include <condition_variable>
#include <iostream>
#include <string>
#include <vector>

namespace comm {
namespace network {

class DeliveryBroker {

  folly::ConcurrentHashMap<std::string, std::vector<DeliveryBrokerMessage>>
      messagesMap;
  std::mutex localMutex;
  std::condition_variable localCv;

public:
  static DeliveryBroker &getInstance();
  void push(
      const uint64_t deliveryTag,
      const std::string toDeviceID,
      const std::string fromDeviceID,
      const std::string payload);
  std::vector<DeliveryBrokerMessage> get(const std::string deviceID);
  bool isEmpty(const std::string key);
  void remove(const std::string key);
  void wait(const std::string key);
};

} // namespace network
} // namespace comm
