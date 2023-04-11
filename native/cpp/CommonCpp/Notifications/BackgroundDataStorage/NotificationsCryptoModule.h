#pragma once

#include "../../CryptoTools/CryptoModule.h"

#include <string>

namespace comm {
class NotificationsCryptoModule {
  const static std::string secureStoreNotificationsAccountDataKey;
  const static std::string notificationsCryptoAccountID;
  const static std::string keyserverHostedNotificationsID;
  const static std::string initialEncryptedMessageContent;

  static void serializeAndFlushCryptoModule(
      crypto::CryptoModule &cryptoModule,
      const std::string &path,
      const std::string &picklingKey,
      const std::string &callingProcessName);
  static crypto::CryptoModule deserializeCryptoModule(
      const std::string &path,
      const std::string &picklingKey);
  static void callCryptoModule(
      std::function<void(crypto::CryptoModule &cryptoModule)> caller,
      const std::string &callingProcessName);

public:
  static void
  initializeNotificationsCryptoAccount(const std::string &callingProcessName);
  static void clearSensitiveData();
  static std::string
  getNotificationsIdentityKeys(const std::string &callingProcessName);
  static void initializeNotificationsSession(
      const std::string &identityKeys,
      const std::string &prekey,
      const std::string &oneTimeKeys,
      const std::string &callingProcessName);
  static bool
  isNotificationsSessionInitialized(const std::string &callingProcessName);
  static crypto::EncryptedData
  generateInitialEncryptedMessage(const std::string &callingProcessName);
};
} // namespace comm
