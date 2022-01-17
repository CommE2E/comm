#include "DeliveryBroker.h"

void DeliveryBrokerPush(
    std::string toDeviceID,
    std::string fromDeviceID,
    std::string payload) {
  std::unique_lock<decltype(DeliveryBroker_m)> lock(DeliveryBroker_m);
  std::vector<DeliveryBrokerMessageStruct> m_list;
  const DeliveryBrokerMessageStruct new_message = {
      .fromDeviceID = fromDeviceID, .payload = payload};
  // If no any record create a new one
  if (DeliveryBrokerMessage_map.count(toDeviceID) == 0) {
    m_list.push_back(new_message);
    DeliveryBrokerMessage_map.insert({toDeviceID, m_list});
    return;
  }
  m_list = DeliveryBrokerMessage_map[toDeviceID];
  m_list.push_back(new_message);
  DeliveryBrokerMessage_map[toDeviceID] = m_list;
};

std::vector<DeliveryBrokerMessageStruct>
DeliveryBrokerGet(std::string deviceID) {
  std::unique_lock<decltype(DeliveryBroker_m)> lock(DeliveryBroker_m);
  // If the key not exist return an empty list
  if (DeliveryBrokerMessage_map.count(deviceID) == 0) {
    return {};
  }
  return DeliveryBrokerMessage_map[deviceID];
};

void DeliveryBrokerRemove(std::string key) {
  std::unique_lock<decltype(DeliveryBroker_m)> lock(DeliveryBroker_m);
  DeliveryBrokerMessage_map.erase(key);
};

void DeliveryBrokerClear() {
  std::unique_lock<decltype(DeliveryBroker_m)> lock(DeliveryBroker_m);
  DeliveryBrokerMessage_map.clear();
};
