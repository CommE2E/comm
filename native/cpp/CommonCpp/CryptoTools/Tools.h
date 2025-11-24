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
  std::string identityKeys;
  std::string oneTimeKeys;

  // Securely wipe keys from memory
  void wipe() {
    // Volatile pointer prevents compiler from optimizing away the zeroing
    volatile char *p1 = const_cast<char *>(identityKeys.data());
    for (size_t i = 0; i < identityKeys.size(); ++i) {
      p1[i] = 0;
    }
    identityKeys.clear();

    volatile char *p2 = const_cast<char *>(oneTimeKeys.data());
    for (size_t i = 0; i < oneTimeKeys.size(); ++i) {
      p2[i] = 0;
    }
    oneTimeKeys.clear();
  }

  ~Keys() {
    wipe();
  }
};

struct EncryptedData {
  std::string message;
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
