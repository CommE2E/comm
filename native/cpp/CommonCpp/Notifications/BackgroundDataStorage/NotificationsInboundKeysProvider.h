#pragma once

#include <string>

namespace comm {
class NotificationsInboundKeysProvider {
public:
  static std::string
  getNotifsInboundKeysForDeviceID(const std::string &deviceID);
};
} // namespace comm
