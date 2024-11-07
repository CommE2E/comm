#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

// base64-encoded
#define KEYSIZE 43
#define SIGNATURESIZE 86

#define ID_KEYS_PREFIX_OFFSET 15
#define SIGNING_KEYS_PREFIX_OFFSET 71

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
  std::optional<int> sessionVersion;
};

class Tools {
private:
  static std::string
  generateRandomString(size_t size, const std::string &availableSigns);

public:
  static std::string generateRandomString(size_t size);
  static std::string generateRandomHexString(size_t size);
  static std::string generateRandomURLSafeString(size_t size);
};

} // namespace crypto
} // namespace comm
