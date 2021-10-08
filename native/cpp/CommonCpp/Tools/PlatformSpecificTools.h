#pragma once

#include "../CryptoTools/Tools.h"

namespace comm {

class PlatformSpecificTools {
public:
  static void generateSecureRandomBytes(crypto::OlmBuffer &buffer, size_t size);
};

} // namespace comm
