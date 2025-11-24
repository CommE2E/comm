#pragma once

#include <memory>
#include <optional>
#include <string>

#include "Tools.h"

#ifndef ANDROID
#include "vodozemac_bindings.rs.h"
#else
#include "lib.rs.h"
#endif

namespace comm {
namespace crypto {

class Session {
  int version;

public:
  ::rust::Box<::VodozemacSession> vodozemacSession;

  // Constructor that takes a vodozemac session
  Session(::rust::Box<::VodozemacSession> session)
      : vodozemacSession(std::move(session)), version(0) {
  }

  static std::unique_ptr<Session> createSessionAsInitializer(
      ::rust::Box<::VodozemacAccount> &account,
      const std::string &idKeys,
      const std::string &preKeys,
      const std::string &preKeySignature,
      const std::optional<std::string> &oneTimeKey,
      bool olmCompatibilityMode);
  static std::pair<std::unique_ptr<Session>, std::string>
  createSessionAsResponder(
      ::rust::Box<::VodozemacAccount> &account,
      const crypto::EncryptedData &encryptedData,
      const std::string &idKeys);
  std::string storeAsB64(const std::string &secretKey);
  static std::unique_ptr<Session>
  restoreFromB64(const std::string &secretKey, const std::string &b64);
  std::string decrypt(EncryptedData &encryptedData);
  EncryptedData encrypt(const std::string &content);
  int getVersion();
  void setVersion(int newVersion);
};

} // namespace crypto
} // namespace comm
