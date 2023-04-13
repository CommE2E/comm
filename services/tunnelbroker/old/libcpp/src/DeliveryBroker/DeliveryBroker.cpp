#include "DeliveryBroker.h"

#include <glog/logging.h>

namespace comm {
namespace network {

DeliveryBroker &DeliveryBroker::getInstance() {
  static DeliveryBroker instance;
  return instance;
};

void DeliveryBroker::push(
    const std::string messageID,
    const uint64_t deliveryTag,
    const std::string toDeviceID,
    const std::string fromDeviceID,
    const std::string payload) {
  try {
    if (this->messagesMap.find(toDeviceID) == this->messagesMap.end()) {
      this->messagesMap.insert(
          toDeviceID,
          std::make_unique<DeliveryBrokerQueue>(
              DELIVERY_BROKER_MAX_QUEUE_SIZE));
    }
    this->messagesMap.find(toDeviceID)
        ->second->blockingWrite(DeliveryBrokerMessage{
            .messageID = messageID,
            .deliveryTag = deliveryTag,
            .fromDeviceID = fromDeviceID,
            .payload = payload});
  } catch (const std::exception &e) {
    LOG(ERROR) << "DeliveryBroker push: "
               << "Got an exception " << e.what();
  }
};

bool DeliveryBroker::isEmpty(const std::string deviceID) {
  if (this->messagesMap.find(deviceID) == this->messagesMap.end()) {
    return true;
  };
  return this->messagesMap.find(deviceID)->second->isEmpty();
};

DeliveryBrokerMessage DeliveryBroker::pop(const std::string deviceID) {
  try {
    // If we don't already have a queue, insert it for the blocking read purpose
    // in case we listen first before the insert happens.
    if (this->messagesMap.find(deviceID) == this->messagesMap.end()) {
      this->messagesMap.insert(
          deviceID,
          std::make_unique<DeliveryBrokerQueue>(
              DELIVERY_BROKER_MAX_QUEUE_SIZE));
    }
    DeliveryBrokerMessage receievedMessage;
    this->messagesMap.find(deviceID)->second->blockingRead(receievedMessage);
    return receievedMessage;
  } catch (const std::exception &e) {
    LOG(ERROR) << "DeliveryBroker pop: "
               << "Got an exception " << e.what();
  }
  return {};
};

void DeliveryBroker::erase(const std::string deviceID) {
  this->messagesMap.erase(deviceID);
};

void DeliveryBroker::deleteQueueIfEmpty(const std::string clientDeviceID) {
  if (DeliveryBroker::getInstance().isEmpty(clientDeviceID)) {
    DeliveryBroker::getInstance().erase(clientDeviceID);
  }
};

} // namespace network
} // namespace comm
