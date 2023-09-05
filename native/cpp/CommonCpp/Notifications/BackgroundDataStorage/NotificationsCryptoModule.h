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
  const static int olmEncryptedTypeMessage;
  static void
  initializeNotificationsCryptoAccount(const std::string &callingProcessName);
  static void clearSensitiveData();
  static std::string
  getNotificationsIdentityKeys(const std::string &callingProcessName);
  static std::string
  generateAndGetNotificationsPrekey(const std::string &callingProcessName);
  static std::string getNotificationsOneTimeKeys(
      const size_t oneTimeKeysAmount,
      const std::string &callingProcessName);
  static crypto::EncryptedData initializeNotificationsSession(
      const std::string &identityKeys,
      const std::string &prekey,
      const std::string &prekeySignature,
      const std::string &oneTimeKeys,
      const std::string &callingProcessName);
  static bool
  isNotificationsSessionInitialized(const std::string &callingProcessName);
  static std::string decrypt(
      const std::string &data,
      const size_t messageType,
      const std::string &callingProcessName);
};
} // namespace comm
