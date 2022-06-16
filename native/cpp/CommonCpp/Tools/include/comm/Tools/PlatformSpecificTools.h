#pragma once

#include <comm/CryptoTools/Tools.h>

namespace comm {

class PlatformSpecificTools {
public:
  static void generateSecureRandomBytes(crypto::OlmBuffer &buffer, size_t size);
  static std::string getDeviceOS();
};

} // namespace comm
