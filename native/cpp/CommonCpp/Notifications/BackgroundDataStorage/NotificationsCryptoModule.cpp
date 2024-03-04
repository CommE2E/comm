#include "NotificationsCryptoModule.h"
#include "../../CryptoTools/Persist.h"
#include "../../CryptoTools/Tools.h"
#include "../../Tools/CommMMKV.h"
#include "../../Tools/CommSecureStore.h"
#include "../../Tools/PlatformSpecificTools.h"

#include <fcntl.h>
#include <folly/String.h>
#include <folly/dynamic.h>
#include <folly/json.h>
#include <unistd.h>
#include <fstream>
#include <memory>
#include <sstream>

namespace comm {

const std::string NotificationsCryptoModule::notificationsCryptoAccountID =
    "notificationsCryptoAccountDataID";
const std::string NotificationsCryptoModule::initialEncryptedMessageContent =
    "{\"type\": \"init\"}";
const int NotificationsCryptoModule::olmEncryptedTypeMessage = 1;

// Introduced temporarily
const std::string ashoatKeyserverID = "256";

std::unique_ptr<crypto::CryptoModule>
NotificationsCryptoModule::deserializeCryptoModule(
    const std::string &path,
    const std::string &picklingKey) {
  std::ifstream pickledPersistStream(path, std::ifstream::in);
  if (!pickledPersistStream.good()) {
    throw std::runtime_error(
        "Attempt to deserialize non-existing notifications crypto account");
  }
  std::stringstream pickledPersistStringStream;
  pickledPersistStringStream << pickledPersistStream.rdbuf();
  pickledPersistStream.close();
  std::string pickledPersist = pickledPersistStringStream.str();

  folly::dynamic persistJSON;
  try {
    persistJSON = folly::parseJson(pickledPersist);
  } catch (const folly::json::parse_error &e) {
    throw std::runtime_error(
        "Notifications crypto account JSON deserialization failed with "
        "reason: " +
        std::string(e.what()));
  }

  std::string accountString = persistJSON["account"].asString();
  crypto::OlmBuffer account =
      std::vector<uint8_t>(accountString.begin(), accountString.end());
  std::unordered_map<std::string, crypto::OlmBuffer> sessions;

  if (persistJSON["sessions"].isNull()) {
    return std::make_unique<crypto::CryptoModule>(
        notificationsCryptoAccountID,
        picklingKey,
        crypto::Persist({account, sessions}));
  }
  for (auto &sessionKeyValuePair : persistJSON["sessions"].items()) {
    std::string targetUserID = sessionKeyValuePair.first.asString();
    std::string sessionData = sessionKeyValuePair.second.asString();
    sessions[targetUserID] =
        std::vector<uint8_t>(sessionData.begin(), sessionData.end());
  }
  return std::make_unique<crypto::CryptoModule>(
      notificationsCryptoAccountID,
      picklingKey,
      crypto::Persist({account, sessions}));
}

std::string
NotificationsCryptoModule::getPicklingKey(bool generateIfNotExists) {
  static std::string notifsPicklingKeyID = "NOTIFS.PICKLING_KEY";
  std::optional<std::string> picklingKey =
      CommMMKV::getString(notifsPicklingKeyID);

  if (picklingKey.has_value()) {
    return picklingKey.value();
  }

  if (!generateIfNotExists) {
    throw std::runtime_error(
        "Attempt to retrieve notifications sessions before it was "
        "correctly initialized.");
  }

  std::string newPicklingKey = crypto::Tools::generateRandomString(64);
  bool picklingKeySet =
      CommMMKV::setString(notifsPicklingKeyID, newPicklingKey);

  if (!picklingKeySet) {
    throw std::runtime_error("Failed to set notifications pickling key.");
  }

  return newPicklingKey;
}

std::string NotificationsCryptoModule::getKeyserverNotificationsSessionKey(
    const std::string &keyserverID) {
  return "KEYSERVER." + keyserverID + ".NOTIFS_SESSION";
}

std::unique_ptr<crypto::CryptoModule>
NotificationsCryptoModule::migrateLegacyNotificationsCryptoModule() {
  const std::string notificationsCryptoAccountPath =
      PlatformSpecificTools::getNotificationsCryptoAccountPath();
  std::ifstream notificationCryptoAccountCheck(notificationsCryptoAccountPath);

  if (!notificationCryptoAccountCheck.good()) {
    notificationCryptoAccountCheck.close();
    return nullptr;
  }
  notificationCryptoAccountCheck.close();

  std::string legacySecureStoreNotifsAccountKey =
      "notificationsCryptoAccountDataKey";
  folly::Optional<std::string> legacyPicklingKey =
      CommSecureStore::get(legacySecureStoreNotifsAccountKey);
  if (!legacyPicklingKey.hasValue()) {
    throw std::runtime_error(
        "Attempt to migrate legacy notifications account but pickling key "
        "missing.");
  }

  std::unique_ptr<crypto::CryptoModule> legacyCryptoModule =
      NotificationsCryptoModule::deserializeCryptoModule(
          notificationsCryptoAccountPath, legacyPicklingKey.value());

  std::string newPicklingKey = NotificationsCryptoModule::getPicklingKey(true);
  crypto::Persist persist = legacyCryptoModule->storeAsB64(newPicklingKey);

  std::string legacyNotificationsSessionID = "keyserverHostedNotificationsID";
  if (persist.sessions.find(legacyNotificationsSessionID) ==
      persist.sessions.end()) {
    return legacyCryptoModule;
  }

  crypto::OlmBuffer autoritativeKeyserverSession =
      persist.sessions.at(legacyNotificationsSessionID);

  std::string autoritativeKeyserverSessionKey =
      NotificationsCryptoModule::getKeyserverNotificationsSessionKey(
          ashoatKeyserverID);

  bool storedSession = CommMMKV::setString(
      autoritativeKeyserverSessionKey,
      std::string(
          autoritativeKeyserverSession.begin(),
          autoritativeKeyserverSession.end()));

  if (!storedSession) {
    throw std::runtime_error(
        "Failed to migrate autoritative keyserver session to MMKV.");
  }

  return legacyCryptoModule;
}

void NotificationsCryptoModule::clearSensitiveData() {
  std::string notificationsCryptoAccountPath =
      PlatformSpecificTools::getNotificationsCryptoAccountPath();
  if (remove(notificationsCryptoAccountPath.c_str()) == -1 && errno != ENOENT) {
    throw std::runtime_error(
        "Unable to remove notifications crypto account. Security requirements "
        "might be violated.");
  }
}

void NotificationsCryptoModule::persistNotificationsSessionInternal(
    const std::string &keyserverID,
    const std::string &picklingKey,
    std::shared_ptr<crypto::Session> session) {
  auto sessionBytes = session->storeAsB64(picklingKey);
  std::string serializedSession =
      std::string(sessionBytes.begin(), sessionBytes.end());

  std::string keyserverNotificationsSessionKey =
      NotificationsCryptoModule::getKeyserverNotificationsSessionKey(
          keyserverID);

  bool sessionStored =
      CommMMKV::setString(keyserverNotificationsSessionKey, serializedSession);

  if (!sessionStored) {
    throw std::runtime_error(
        "Failed to persist to MMKV notifications session for keyserver: " +
        keyserverID);
  }
}

std::unique_ptr<crypto::Session>
NotificationsCryptoModule::fetchNotificationsSession(
    const std::string &keyserverID,
    const std::string &picklingKey) {
  std::string keyserverNotificationsSessionKey =
      NotificationsCryptoModule::getKeyserverNotificationsSessionKey(
          keyserverID);
  std::optional<std::string> serializedSession =
      CommMMKV::getString(keyserverNotificationsSessionKey);

  if (!serializedSession.has_value()) {
    throw std::runtime_error(
        "Missing notifications session for keyserver: " + keyserverID);
  }

  crypto::OlmBuffer sessionBytes = crypto::OlmBuffer{
      serializedSession.value().begin(), serializedSession.value().end()};
  std::unique_ptr<crypto::Session> session =
      crypto::Session::restoreFromB64(picklingKey, sessionBytes);
  return session;
}

void NotificationsCryptoModule::persistNotificationsSession(
    const std::string &keyserverID,
    std::shared_ptr<crypto::Session> keyserverNotificationsSession) {
  std::string picklingKey = NotificationsCryptoModule::getPicklingKey(true);
  NotificationsCryptoModule::persistNotificationsSessionInternal(
      keyserverID, picklingKey, keyserverNotificationsSession);
}

bool NotificationsCryptoModule::isNotificationsSessionInitialized(
    const std::string &keyserverID) {
  std::string keyserverNotificationsSessionKey =
      "KEYSERVER." + keyserverID + ".NOTIFS_SESSION";
  return CommMMKV::getString(keyserverNotificationsSessionKey).has_value();
}

std::string NotificationsCryptoModule::decrypt(
    const std::string &keyserverID,
    const std::string &data,
    const size_t messageType) {
  std::string picklingKey = NotificationsCryptoModule::getPicklingKey(false);
  std::unique_ptr<crypto::Session> session =
      NotificationsCryptoModule::fetchNotificationsSession(
          keyserverID, picklingKey);
  crypto::EncryptedData encryptedData{
      std::vector<uint8_t>(data.begin(), data.end()), messageType};
  std::string decryptedData = session->decrypt(encryptedData);
  NotificationsCryptoModule::persistNotificationsSessionInternal(
      keyserverID, picklingKey, std::move(session));
  return decryptedData;
}

NotificationsCryptoModule::StatefulDecryptResult::StatefulDecryptResult(
    std::unique_ptr<crypto::Session> session,
    std::string keyserverID,
    std::string decryptedData)
    : sessionState(std::move(session)),
      keyserverID(keyserverID),
      decryptedData(decryptedData) {
}

std::string
NotificationsCryptoModule::StatefulDecryptResult::getDecryptedData() {
  return this->decryptedData;
}

std::string NotificationsCryptoModule::StatefulDecryptResult::getKeyserverID() {
  return this->keyserverID;
}

std::unique_ptr<NotificationsCryptoModule::StatefulDecryptResult>
NotificationsCryptoModule::statefulDecrypt(
    const std::string &keyserverID,
    const std::string &data,
    const size_t messageType) {
  std::string picklingKey = NotificationsCryptoModule::getPicklingKey(false);

  std::unique_ptr<crypto::Session> session =
      NotificationsCryptoModule::fetchNotificationsSession(
          keyserverID, picklingKey);

  crypto::EncryptedData encryptedData{
      std::vector<uint8_t>(data.begin(), data.end()), messageType};
  std::string decryptedData = session->decrypt(encryptedData);

  StatefulDecryptResult statefulDecryptResult(
      std::move(session), keyserverID, decryptedData);
  return std::make_unique<StatefulDecryptResult>(
      std::move(statefulDecryptResult));
}

void NotificationsCryptoModule::flushState(
    std::unique_ptr<StatefulDecryptResult> statefulDecryptResult) {
  std::string picklingKey = NotificationsCryptoModule::getPicklingKey(false);
  NotificationsCryptoModule::persistNotificationsSessionInternal(
      statefulDecryptResult->getKeyserverID(),
      picklingKey,
      std::move(statefulDecryptResult->sessionState));
}
} // namespace comm
