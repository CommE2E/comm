#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "olm/olm.h"

#define KEYSIZE 43
#define ID_KEYS_PREFIX_OFFSET 15
#define PRE_KEY_PREFIX_OFFSET 25
#define ONE_TIME_KEYS_PREFIX_OFFSET 25
#define ONE_TIME_KEYS_MIDDLE_OFFSET 12

namespace comm {
namespace crypto {

typedef std::vector<std::uint8_t> OlmBuffer;

struct Keys {
  OlmBuffer identityKeys; // size = 116
  OlmBuffer oneTimeKeys;  // size = 43 each
};

struct EncryptedData {
  OlmBuffer message;
  size_t messageType;
};

class Tools {
private:
  static std::string
  generateRandomString(size_t size, const std::string &availableSigns);

public:
  static std::string generateRandomString(size_t size);
  static std::string generateRandomHexString(size_t size);
};

} // namespace crypto
} // namespace comm
