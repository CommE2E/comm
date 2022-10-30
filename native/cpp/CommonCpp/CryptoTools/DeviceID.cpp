#include "DeviceID.h"

namespace comm {

const std::unordered_map<std::string, DeviceType>
    DeviceIDGenerator::DEVICE_TYPE_MAP = {
        {"KEYSERVER", DeviceType::KEYSERVER},
        {"WEB", DeviceType::WEB},
        {"MOBILE", DeviceType::MOBILE}};

std::string DeviceIDGenerator::generateDeviceID(std::string deviceType) {
  auto type = DeviceIDGenerator::DEVICE_TYPE_MAP.find(deviceType);
  if (type == DeviceIDGenerator::DEVICE_TYPE_MAP.end()) {
    throw std::invalid_argument{
        "generateDeviceID: incorrect function argument. Must be one of: "
        "KEYSERVER, WEB, MOBILE."};
  }
  rust::String deviceID = generate_device_id(type->second);
  return std::string(deviceID.c_str());
}

} // namespace comm
