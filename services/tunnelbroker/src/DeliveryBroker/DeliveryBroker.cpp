#include "DeliveryBroker.h"

namespace comm {
namespace network {

DeliveryBroker &DeliveryBroker::getInstance() {
  static DeliveryBroker instance;
  return instance;
};

void DeliveryBroker::push(
    const uint64_t deliveryTag,
    const std::string toDeviceID,
    const std::string fromDeviceID,
    const std::string payload) {
  try {
    std::unique_lock<std::mutex> localLock(this->localMutex);
    std::vector<DeliveryBrokerMessage> messagesList;
    const DeliveryBrokerMessage newMessage = {
        .deliveryTag = deliveryTag,
        .fromDeviceID = fromDeviceID,
        .payload = payload};

    if (this->messagesMap.find(toDeviceID) == this->messagesMap.end()) {
      messagesList.push_back(newMessage);
      this->messagesMap.insert({toDeviceID, messagesList});
      this->localCv.notify_all();
      return;
    }

    messagesList = this->messagesMap[toDeviceID];
    messagesList.push_back(newMessage);
    this->messagesMap.assign(toDeviceID, messagesList);
    this->localCv.notify_all();
  } catch (const std::exception &e) {
    std::cout << "DeliveryBroker: "
              << "Got an exception " << e.what() << std::endl;
    this->localCv.notify_all();
  }
};

std::vector<DeliveryBrokerMessage>
DeliveryBroker::get(const std::string deviceID) {
  if (this->messagesMap.find(deviceID) == this->messagesMap.end()) {
    return {};
  }
  return this->messagesMap[deviceID];
};

bool DeliveryBroker::isEmpty(const std::string key) {
  if (this->messagesMap.empty()) {
    return true;
  }
  return (this->messagesMap.find(key) == this->messagesMap.end());
};

void DeliveryBroker::remove(const std::string key) {
  this->messagesMap.erase(key);
};

void DeliveryBroker::wait(const std::string key) {
  std::unique_lock<std::mutex> localLock(this->localMutex);
  this->localCv.wait(localLock, [this, &key] { return !this->isEmpty(key); });
};

} // namespace network
} // namespace comm
