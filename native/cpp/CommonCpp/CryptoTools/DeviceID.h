#pragma once

#include "lib.rs.h"
#include <string>
#include <unordered_map>

namespace comm {

class DeviceIDGenerator {
  static const std::unordered_map<std::string, DeviceType> DEVICE_TYPE_MAP;

public:
  static std::string generateDeviceID(std::string deviceType);
};

} // namespace comm
