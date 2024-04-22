#pragma once

#include <memory>
#include <string>

#include "Tools.h"

#include "olm/olm.h"

namespace comm {
namespace crypto {

class Session {
  OlmBuffer olmSessionBuffer;
  int version;

public:
  static std::unique_ptr<Session> createSessionAsInitializer(
      OlmAccount *account,
      std::uint8_t *ownerIdentityKeys,
      const OlmBuffer &idKeys,
      const OlmBuffer &preKeys,
      const OlmBuffer &preKeySignature,
      const OlmBuffer &oneTimeKey);
  static std::unique_ptr<Session> createSessionAsResponder(
      OlmAccount *account,
      std::uint8_t *ownerIdentityKeys,
      const OlmBuffer &encryptedMessage,
      const OlmBuffer &idKeys);
  OlmBuffer storeAsB64(const std::string &secretKey);
  static std::unique_ptr<Session>
  restoreFromB64(const std::string &secretKey, OlmBuffer &b64);
  OlmSession *getOlmSession();
  std::string decrypt(EncryptedData &encryptedData);
  std::string decryptSequential(EncryptedData &encryptedData);
  int getVersion();
  void setVersion(int newVersion);
};

} // namespace crypto
} // namespace comm
