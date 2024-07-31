#pragma once

#include "../../CryptoTools/CryptoModule.h"

#include <functional>
#include <string>

namespace comm {
class NotificationsCryptoModule {
  const static std::string notificationsCryptoAccountID;

  // Used for handling of legacy notifications sessions
  const static std::string secureStoreNotificationsAccountDataKey;
  const static std::string keyserverHostedNotificationsID;

  static std::unique_ptr<crypto::CryptoModule> deserializeCryptoModule(
      const std::string &path,
      const std::string &picklingKey);
  static void serializeAndFlushCryptoModule(
      std::unique_ptr<crypto::CryptoModule> cryptoModule,
      const std::string &path,
      const std::string &picklingKey);

  static std::string
  getKeyserverNotificationsSessionKey(const std::string &keyserverID);
  static std::string
  getDeviceNotificationsSessionKey(const std::string &deviceID);
  static std::string serializeNotificationsSession(
      std::shared_ptr<crypto::Session> session,
      std::string picklingKey);
  static std::pair<std::unique_ptr<crypto::Session>, std::string>
  deserializeNotificationsSession(const std::string &serializedSession);
  static void persistNotificationsSessionInternal(
      bool isKeyserverSession,
      const std::string &senderID,
      const std::string &picklingKey,
      std::shared_ptr<crypto::Session> session);
  static std::optional<std::pair<std::unique_ptr<crypto::Session>, std::string>>
  fetchNotificationsSession(
      bool isKeyserverSession,
      const std::string &senderID);

public:
  const static std::string initialEncryptedMessageContent;
  const static int olmEncryptedTypeMessage;

  static void clearSensitiveData();
  static void persistNotificationsSession(
      const std::string &keyserverID,
      std::shared_ptr<crypto::Session> keyserverNotificationsSession);
  static void persistDeviceNotificationsSession(
      const std::string &deviceID,
      std::shared_ptr<crypto::Session> peerNotificationsSession);
  static bool isNotificationsSessionInitialized(const std::string &keyserverID);
  static bool
  isDeviceNotificationsSessionInitialized(const std::string &deviceID);
  static std::vector<std::pair<std::string, bool>>
  isNotificationsSessionInitializedWithDevices(
      const std::vector<std::string> &deviceIDs);

  class BaseStatefulDecryptResult {
    BaseStatefulDecryptResult(
        std::string picklingKey,
        std::string decryptedData);

    std::string picklingKey;
    std::string decryptedData;
    friend NotificationsCryptoModule;

  public:
    std::string getDecryptedData();
    virtual void flushState() = 0;
    virtual ~BaseStatefulDecryptResult() = default;
  };

  class StatefulDecryptResult : public BaseStatefulDecryptResult {
    StatefulDecryptResult(
        std::unique_ptr<crypto::Session> session,
        std::string keyserverID,
        std::string picklingKey,
        std::string decryptedData);

    std::unique_ptr<crypto::Session> sessionState;
    std::string keyserverID;
    friend NotificationsCryptoModule;

  public:
    void flushState() override;
  };

  class LegacyStatefulDecryptResult : public BaseStatefulDecryptResult {
    LegacyStatefulDecryptResult(
        std::unique_ptr<crypto::CryptoModule> cryptoModule,
        std::string path,
        std::string picklingKey,
        std::string decryptedData);
    std::unique_ptr<crypto::CryptoModule> cryptoModule;
    std::string path;
    friend NotificationsCryptoModule;

  public:
    void flushState() override;
  };

private:
  static std::unique_ptr<NotificationsCryptoModule::BaseStatefulDecryptResult>
  prepareLegacyDecryptedState(
      const std::string &data,
      const size_t messageType);

public:
  static std::string decrypt(
      const std::string &keyserverID,
      const std::string &data,
      const size_t messageType);

  static std::unique_ptr<BaseStatefulDecryptResult> statefulDecrypt(
      const std::string &keyserverID,
      const std::string &data,
      const size_t messageType);

  static crypto::EncryptedData
  encrypt(const std::string &deviceID, const std::string &payload);

  static void
  flushState(std::unique_ptr<BaseStatefulDecryptResult> statefulDecryptResult);
};
} // namespace comm
