#pragma once

#include <memory>
#include <string>
#include <unordered_map>

#include "Persist.h"
#include "Session.h"
#include "Tools.h"

#ifndef ANDROID
#include "vodozemac_bindings.rs.h"
#else
#include "lib.rs.h"
#endif

namespace comm {
namespace crypto {

class CryptoModule {

  ::rust::Box<::VodozemacAccount> vodozemacAccount;

  std::unordered_map<std::string, std::shared_ptr<Session>> sessions = {};

  Keys keys;

  void exposePublicIdentityKeys();
  void generateOneTimeKeys(size_t oneTimeKeysAmount);
  std::string generateAndGetPrekey();
  // returns number of published keys
  size_t publishOneTimeKeys();
  bool prekeyExistsAndOlderThan(uint64_t threshold);
  bool prekeyDoesntExist();
  bool isPrekeySignatureValid();
  std::string pickleAccount(const std::string &secretKey);

public:
  CryptoModule(std::string secretKey, Persist persist);

  // CryptoModule's accountBuffer cannot be safely copied
  // See explanation in https://phab.comm.dev/D9562
  CryptoModule(const CryptoModule &) = delete;

  std::string getIdentityKeys();
  std::vector<std::string>
  getOneTimeKeysForPublishing(size_t oneTimeKeysAmount = 10);

  // Prekey rotation methods for X3DH
  std::string getPrekey();
  std::string getPrekeySignature();
  std::optional<std::string> getUnpublishedPrekey();
  void markPrekeyAsPublished();
  void forgetOldPrekey();

  std::string initializeInboundForReceivingSession(
      const std::string &targetDeviceId,
      const crypto::EncryptedData &encryptedData,
      const std::string &idKeys,
      int sessionVersion,
      const bool overwrite);
  int initializeOutboundForSendingSession(
      const std::string &targetDeviceId,
      const std::string &idKeys,
      const std::string &preKeys,
      const std::string &preKeySignature,
      const std::optional<std::string> &oneTimeKey);
  bool hasSessionFor(const std::string &targetDeviceId);
  std::shared_ptr<Session> getSessionByDeviceId(const std::string &deviceId);
  void removeSessionByDeviceId(const std::string &deviceId);

  Persist storeAsB64(const std::string &secretKey);
  void restoreFromB64(const std::string &secretKey, Persist persist);
  std::string pickleAccountToString(const std::string &secretKey);

  EncryptedData
  encrypt(const std::string &targetDeviceId, const std::string &content);
  std::string
  decrypt(const std::string &targetDeviceId, EncryptedData &encryptedData);

  std::string signMessage(const std::string &message);
  static void verifySignature(
      const std::string &publicKey,
      const std::string &message,
      const std::string &signature);
  std::optional<std::string> validatePrekey();
};

} // namespace crypto
} // namespace comm
