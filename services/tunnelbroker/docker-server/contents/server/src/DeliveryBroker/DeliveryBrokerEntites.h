#pragma once

#include <string.h>
#include <mutex>
#include <unordered_map>
#include <vector>

struct DeliveryBrokerMessageStruct {
  std::string fromDeviceID;
  std::string payload;
  std::vector<std::string> blobHashes;
};

std::mutex DeliveryBroker_m;
std::unordered_map<std::string, std::vector<DeliveryBrokerMessageStruct>>
    DeliveryBrokerMessage_map;
