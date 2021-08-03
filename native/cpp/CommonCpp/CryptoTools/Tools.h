#pragma once

#include <random>
#include <vector>

#include "olm/olm.h"

#define KEYSIZE 43
#define ID_KEYS_PREFIX_OFFSET 15
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
  std::mt19937 mt;

  Tools();

public:
  static Tools &getInstance() {
    static Tools instance;
    return instance;
  }
  Tools(Tools const &) = delete;
  void operator=(Tools const &) = delete;

  std::string generateRandomString(size_t size);

  unsigned char generateRandomByte();
  void generateRandomBytes(OlmBuffer &buffer, size_t size);
};

} // namespace crypto
} // namespace comm
