#pragma once

#include <memory>
#include <string>

#include "Tools.h"

namespace comm {
namespace crypto {

class Session {
  OlmAccount *ownerUserAccount;
  std::uint8_t *ownerIdentityKeys;

  OlmSession *olmSession = nullptr;
  OlmBuffer olmSessionBuffer;

  Session(OlmAccount *account, std::uint8_t *ownerIdentityKeys)
      : ownerUserAccount(account), ownerIdentityKeys(ownerIdentityKeys) {
  }

public:
  static std::unique_ptr<Session> createSessionAsInitializer(
      OlmAccount *account,
      std::uint8_t *ownerIdentityKeys,
      const OlmBuffer &idKeys,
      const OlmBuffer &preKeys,
      const OlmBuffer &oneTimeKeys,
      size_t keyIndex = 0);
  static std::unique_ptr<Session> createSessionAsResponder(
      OlmAccount *account,
      std::uint8_t *ownerIdentityKeys,
      const OlmBuffer &encryptedMessage,
      const OlmBuffer &idKeys);
  OlmBuffer storeAsB64(const std::string &secretKey);
  static std::unique_ptr<Session> restoreFromB64(
      OlmAccount *account,
      std::uint8_t *ownerIdentityKeys,
      const std::string &secretKey,
      OlmBuffer &b64);
  OlmSession *getOlmSession();
};

} // namespace crypto
} // namespace comm
