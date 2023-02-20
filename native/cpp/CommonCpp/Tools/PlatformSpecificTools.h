#pragma once

#include "../CryptoTools/Tools.h"

namespace comm {

class PlatformSpecificTools {
public:
  static void generateSecureRandomBytes(crypto::OlmBuffer &buffer, size_t size);
  static std::string getDeviceOS();
  static std::string getNotificationsCryptoAccountPath();
};

} // namespace comm
