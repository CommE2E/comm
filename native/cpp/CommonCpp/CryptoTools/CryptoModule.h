#pragma once

#include <memory>
#include <string>
#include <unordered_map>

#include "olm/olm.h"

#include "Persist.h"
#include "Session.h"
#include "Tools.h"

namespace comm {
namespace crypto {

class CryptoModule {

  OlmAccount *account = nullptr;
  OlmBuffer accountBuffer;

  std::unordered_map<std::string, std::shared_ptr<Session>> sessions = {};

  Keys keys;

  void createAccount();
  void exposePublicIdentityKeys();
  void generateOneTimeKeys(size_t oneTimeKeysAmount);
  // returns number of published keys
  size_t publishOneTimeKeys();

public:
  const std::string id;
  CryptoModule();
  CryptoModule(std::string secretKey, Persist persist);

  static Keys keysFromStrings(
      const std::string &identityKeys,
      const std::string &oneTimeKeys);

  std::string getIdentityKeys();
  std::string getOneTimeKeys(size_t oneTimeKeysAmount = 50);

  void initializeInboundForReceivingSession(
      const std::string &targetUserId,
      const OlmBuffer &encryptedMessage,
      const OlmBuffer &idKeys,
      const bool overwrite = false);
  void initializeOutboundForSendingSession(
      const std::string &targetUserId,
      const OlmBuffer &idKeys,
      const OlmBuffer &oneTimeKeys,
      size_t keyIndex = 0);
  bool hasSessionFor(const std::string &targetUserId);
  std::shared_ptr<Session> getSessionByUserId(const std::string &userId);
  bool matchesInboundSession(
      const std::string &targetUserId,
      EncryptedData encryptedData,
      const OlmBuffer &theirIdentityKey) const;

  Persist storeAsB64(const std::string &secretKey);
  void restoreFromB64(const std::string &secretKey, Persist persist);

  EncryptedData
  encrypt(const std::string &targetUserId, const std::string &content);
  std::string decrypt(
      const std::string &targetUserId,
      EncryptedData encryptedData,
      const OlmBuffer &theirIdentityKey);
};

} // namespace crypto
} // namespace comm
