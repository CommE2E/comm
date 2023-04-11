#pragma once

#include "../../CryptoTools/CryptoModule.h"

#include <string>

namespace comm {
class NotificationsCryptoModule {
  const static std::string secureStoreNotificationsAccountDataKey;
  const static std::string notificationsCryptoAccountID;

  static void serializeAndFlushCryptoModule(
      crypto::CryptoModule &cryptoModule,
      const std::string &path,
      const std::string &picklingKey,
      const std::string &callingProcessName);
  static crypto::CryptoModule deserializeCryptoModule(
      const std::string &path,
      const std::string &picklingKey);
  static void callCryptoModule(
      std::function<void(crypto::CryptoModule cryptoModule)> caller,
      const std::string &callingProcessName);

public:
  static void
  initializeNotificationsCryptoAccount(const std::string &callingProcessName);
  static void clearSensitiveData();
  static std::string
  getNotificationsIdentityKeys(const std::string &callingProcessName);
  static std::string getNotificationsOneTimeKeys(
      size_t oneTimeKeysAmount,
      const std::string &callingProcessName);
  static std::string
  generateNotificationsPreKey(const std::string &callingProcessName);
};
} // namespace comm
