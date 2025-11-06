#pragma once

#include <memory>
#include <optional>
#include <string>

#include "Tools.h"

#include "olm/olm.h"

#include "lib.rs.h"
#ifndef ANDROID
#include "vodozemac_bindings.rs.h"
#endif

namespace comm {
namespace crypto {

class Session {
  int version;
  std::string secret_key;

public:
  ::rust::Box<::VodozemacSession> vodozemacSession;
  
  // Constructor that takes a vodozemac session
  Session(::rust::Box<::VodozemacSession> session) : vodozemacSession(std::move(session)), version(0) {}
  
  static std::unique_ptr<Session> createSessionAsInitializer(
      OlmAccount *account,
      std::uint8_t *ownerIdentityKeys,
      const OlmBuffer &idKeys,
      const OlmBuffer &preKeys,
      const OlmBuffer &preKeySignature,
      const std::optional<OlmBuffer> &oneTimeKey);
  static std::unique_ptr<Session> createSessionAsResponder(
      OlmAccount *account,
      std::uint8_t *ownerIdentityKeys,
      const OlmBuffer &encryptedMessage,
      const OlmBuffer &idKeys);
  OlmBuffer storeAsB64(const std::string &secretKey);
  static std::unique_ptr<Session>
  restoreFromB64(const std::string &secretKey, OlmBuffer &b64);
  std::string decrypt(EncryptedData &encryptedData);
  EncryptedData encrypt(const std::string &content);
  int getVersion();
  void setVersion(int newVersion);
};

} // namespace crypto
} // namespace comm
