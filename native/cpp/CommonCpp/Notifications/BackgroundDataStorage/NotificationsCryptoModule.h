#pragma once

#include "../../CryptoTools/CryptoModule.h"

#include <string>

namespace comm {
class NotificationsCryptoModule {
  const static std::string notificationsCryptoAccountID;

  static void serializeAndFlushCryptoModule(
      crypto::CryptoModule &cryptoModule,
      const std::string &path,
      const std::string &picklingKey,
      const std::string &callingProcessName);
  static crypto::CryptoModule deserializeCryptoModule(
      const std::string &path,
      const std::string &picklingKey);

public:
  const static std::string secureStoreNotificationsAccountDataKey;

  static void
  initializeNotificationsCryptoAccount(const std::string &callingProcessName);
  static void clearSensitiveData();
  static std::string
  getNotificationsIdentityKeys(const std::string &picklingKey);
};
} // namespace comm
