#pragma once

#include "../../CryptoTools/CryptoModule.h"

#include <functional>
#include <string>

namespace comm {
class NotificationsCryptoModule {
  const static std::string notificationsCryptoAccountID;

  // Used for migration of legacy notifications sessions
  static std::unique_ptr<crypto::CryptoModule> deserializeCryptoModule(
      const std::string &path,
      const std::string &picklingKey);
  static std::string
  getKeyserverNotificationsSessionKey(const std::string &keyserverID);
  static std::string serializeNotificationsSession(
      std::shared_ptr<crypto::Session> session,
      std::string picklingKey);
  static std::pair<std::unique_ptr<crypto::Session>, std::string>
  deserializeNotificationsSession(const std::string &serializedSession);
  static void persistNotificationsSessionInternal(
      const std::string &keyserverID,
      const std::string &picklingKey,
      std::shared_ptr<crypto::Session> session);
  static std::pair<std::unique_ptr<crypto::Session>, std::string>
  fetchNotificationsSession(const std::string &keyserverID);

public:
  const static std::string initialEncryptedMessageContent;
  const static int olmEncryptedTypeMessage;

  static std::unique_ptr<crypto::CryptoModule>
  migrateLegacyNotificationsCryptoModule();
  static void clearSensitiveData();
  static void persistNotificationsSession(
      const std::string &keyserverID,
      std::shared_ptr<crypto::Session> keyserverNotificationsSession);
  static bool isNotificationsSessionInitialized(const std::string &keyserverID);
  static std::string decrypt(
      const std::string &keyserverID,
      const std::string &data,
      const size_t messageType);

  class StatefulDecryptResult {
    StatefulDecryptResult(
        std::unique_ptr<crypto::Session> session,
        std::string keyserverID,
        std::string picklingKey,
        std::string decryptedData);
    std::unique_ptr<crypto::Session> sessionState;
    std::string keyserverID;
    std::string picklingKey;
    std::string decryptedData;
    friend NotificationsCryptoModule;

  public:
    std::string getDecryptedData();
    std::string getKeyserverID();
    std::string getPicklingKey();
  };

  static std::unique_ptr<StatefulDecryptResult> statefulDecrypt(
      const std::string &keyserverID,
      const std::string &data,
      const size_t messageType);
  static void
  flushState(std::unique_ptr<StatefulDecryptResult> statefulDecryptResult);
};
} // namespace comm
