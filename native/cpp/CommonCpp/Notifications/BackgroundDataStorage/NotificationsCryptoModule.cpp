#include "NotificationsCryptoModule.h"
#include "../../CryptoTools/Persist.h"
#include "../../CryptoTools/Tools.h"
#include "../../Tools/CommMMKV.h"
#include "../../Tools/CommSecureStore.h"
#include "../../Tools/Logger.h"
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
const std::string
    NotificationsCryptoModule::secureStoreNotificationsAccountDataKey =
        "notificationsCryptoAccountDataKey";
const std::string NotificationsCryptoModule::notificationsCryptoAccountID =
    "notificationsCryptoAccountDataID";
const std::string NotificationsCryptoModule::keyserverHostedNotificationsID =
    "keyserverHostedNotificationsID";
const std::string NotificationsCryptoModule::initialEncryptedMessageContent =
    "{\"type\": \"init\"}";
const int NotificationsCryptoModule::olmEncryptedTypeMessage = 1;

// This constant is only used to migrate the existing notifications
// session with production keyserver from flat file to MMKV. This
// migration will fire when user updates the app. It will also fire
// on dev env provided old keyserver set up is used. Developers willing
// to use new keyserver set up must log out before installing updated
// app version. Do not introduce new usages of this constant in the code!!!
const std::string ashoatKeyserverIDUsedOnlyForMigrationFromLegacyNotifStorage =
    "256";
const int temporaryFilePathRandomSuffixLength = 32;
const std::string notificationsAccountKey = "NOTIFS.ACCOUNT";

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
  std::unordered_map<std::string, crypto::SessionPersist> sessions;

  if (persistJSON["sessions"].isNull()) {
    return std::make_unique<crypto::CryptoModule>(
        notificationsCryptoAccountID,
        picklingKey,
        crypto::Persist({account, sessions}));
  }
  for (auto &sessionKeyValuePair : persistJSON["sessions"].items()) {
    std::string targetUserID = sessionKeyValuePair.first.asString();
    std::string sessionData = sessionKeyValuePair.second.asString();
    sessions[targetUserID] = {
        std::vector<uint8_t>(sessionData.begin(), sessionData.end()), 1};
  }
  return std::make_unique<crypto::CryptoModule>(
      notificationsCryptoAccountID,
      picklingKey,
      crypto::Persist({account, sessions}));
}

void NotificationsCryptoModule::serializeAndFlushCryptoModule(
    std::unique_ptr<crypto::CryptoModule> cryptoModule,
    const std::string &path,
    const std::string &picklingKey) {
  crypto::Persist persist = cryptoModule->storeAsB64(picklingKey);

  folly::dynamic sessions = folly::dynamic::object;
  for (auto &sessionKeyValuePair : persist.sessions) {
    std::string targetUserID = sessionKeyValuePair.first;
    crypto::OlmBuffer sessionData = sessionKeyValuePair.second.buffer;
    sessions[targetUserID] =
        std::string(sessionData.begin(), sessionData.end());
  }

  std::string account =
      std::string(persist.account.begin(), persist.account.end());
  folly::dynamic persistJSON =
      folly::dynamic::object("account", account)("sessions", sessions);
  std::string pickledPersist = folly::toJson(persistJSON);

  std::string temporaryFilePathRandomSuffix =
      crypto::Tools::generateRandomHexString(
          temporaryFilePathRandomSuffixLength);
  std::string temporaryPath = path + temporaryFilePathRandomSuffix;

  mode_t readWritePermissionsMode = 0666;
  int temporaryFD =
      open(temporaryPath.c_str(), O_CREAT | O_WRONLY, readWritePermissionsMode);
  if (temporaryFD == -1) {
    throw std::runtime_error(
        "Failed to create temporary file. Unable to atomically update "
        "notifications crypto account. Details: " +
        std::string(strerror(errno)));
  }
  ssize_t bytesWritten =
      write(temporaryFD, pickledPersist.c_str(), pickledPersist.length());
  if (bytesWritten == -1 || bytesWritten != pickledPersist.length()) {
    remove(temporaryPath.c_str());
    throw std::runtime_error(
        "Failed to write all data to temporary file. Unable to atomically "
        "update notifications crypto account. Details: " +
        std::string(strerror(errno)));
  }
  if (fsync(temporaryFD) == -1) {
    remove(temporaryPath.c_str());
    throw std::runtime_error(
        "Failed to synchronize temporary file data with hardware storage. "
        "Unable to atomically update notifications crypto account. Details: " +
        std::string(strerror(errno)));
  };
  close(temporaryFD);
  if (rename(temporaryPath.c_str(), path.c_str()) == -1) {
    remove(temporaryPath.c_str());
    throw std::runtime_error(
        "Failed to replace temporary file content with notifications crypto "
        "account. Unable to atomically update notifications crypto account. "
        "Details: " +
        std::string(strerror(errno)));
  }
  remove(temporaryPath.c_str());
}

std::string NotificationsCryptoModule::getKeyserverNotificationsSessionKey(
    const std::string &keyserverID) {
  return "KEYSERVER." + keyserverID + ".NOTIFS_SESSION";
}

std::string NotificationsCryptoModule::getDeviceNotificationsSessionKey(
    const std::string &deviceID) {
  return "DEVICE." + deviceID + ".NOTIFS_SESSION";
}

std::string NotificationsCryptoModule::serializeNotificationsSession(
    std::shared_ptr<crypto::Session> session,
    std::string picklingKey) {
  crypto::OlmBuffer pickledSessionBytes = session->storeAsB64(picklingKey);
  std::string pickledSession =
      std::string{pickledSessionBytes.begin(), pickledSessionBytes.end()};
  folly::dynamic serializedSessionJson = folly::dynamic::object(
      "session", pickledSession)("picklingKey", picklingKey);
  return folly::toJson(serializedSessionJson);
}

std::pair<std::unique_ptr<crypto::Session>, std::string>
NotificationsCryptoModule::deserializeNotificationsSession(
    const std::string &serializedSession) {
  folly::dynamic serializedSessionJson;
  try {
    serializedSessionJson = folly::parseJson(serializedSession);
  } catch (const folly::json::parse_error &e) {
    throw std::runtime_error(
        "Notifications session deserialization failed with reason: " +
        std::string(e.what()));
  }

  std::string pickledSession = serializedSessionJson["session"].asString();
  crypto::OlmBuffer pickledSessionBytes =
      crypto::OlmBuffer{pickledSession.begin(), pickledSession.end()};
  std::string picklingKey = serializedSessionJson["picklingKey"].asString();
  std::unique_ptr<crypto::Session> session =
      crypto::Session::restoreFromB64(picklingKey, pickledSessionBytes);
  return {std::move(session), picklingKey};
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
    bool isKeyserverSession,
    const std::string &senderID,
    const std::string &picklingKey,
    std::shared_ptr<crypto::Session> session) {
  std::string serializedSession =
      NotificationsCryptoModule::serializeNotificationsSession(
          session, picklingKey);

  std::string notificationsSessionKey;
  std::string persistenceErrorMessage;

  if (isKeyserverSession) {
    notificationsSessionKey =
        NotificationsCryptoModule::getKeyserverNotificationsSessionKey(
            senderID);
    persistenceErrorMessage =
        "Failed to persist to MMKV notifications session for keyserver: " +
        senderID;
  } else {
    notificationsSessionKey =
        NotificationsCryptoModule::getDeviceNotificationsSessionKey(senderID);
    persistenceErrorMessage =
        "Failed to persist to MMKV notifications session for device: " +
        senderID;
  }

  bool sessionStored =
      CommMMKV::setString(notificationsSessionKey, serializedSession);

  if (!sessionStored) {
    throw std::runtime_error(persistenceErrorMessage);
  }
}

std::optional<std::pair<std::unique_ptr<crypto::Session>, std::string>>
NotificationsCryptoModule::fetchNotificationsSession(
    bool isKeyserverSession,
    const std::string &senderID) {
  std::string notificationsSessionKey;
  if (isKeyserverSession) {
    notificationsSessionKey =
        NotificationsCryptoModule::getKeyserverNotificationsSessionKey(
            senderID);
  } else {
    notificationsSessionKey =
        NotificationsCryptoModule::getDeviceNotificationsSessionKey(senderID);
  }

  std::optional<std::string> serializedSession;
  try {
    serializedSession = CommMMKV::getString(notificationsSessionKey);
  } catch (const CommMMKV::InitFromNSEForbiddenError &e) {
    serializedSession = std::nullopt;
  }

  if (!serializedSession.has_value() && isKeyserverSession &&
      senderID != ashoatKeyserverIDUsedOnlyForMigrationFromLegacyNotifStorage) {
    throw std::runtime_error(
        "Missing notifications session for keyserver: " + senderID);
  } else if (!serializedSession.has_value()) {
    return std::nullopt;
  }

  return NotificationsCryptoModule::deserializeNotificationsSession(
      serializedSession.value());
}

void NotificationsCryptoModule::persistNotificationsAccount(
    const std::shared_ptr<crypto::CryptoModule> cryptoModule,
    const std::string &picklingKey) {
  crypto::Persist serializedCryptoModule =
      cryptoModule->storeAsB64(picklingKey);
  crypto::OlmBuffer serializedAccount = serializedCryptoModule.account;
  std::string serializedAccountString{
      serializedAccount.begin(), serializedAccount.end()};

  folly::dynamic serializedAccountObject = folly::dynamic::object(
      "account", serializedAccountString)("picklingKey", picklingKey);
  std::string serializedAccountJson = folly::toJson(serializedAccountObject);

  bool accountPersisted =
      CommMMKV::setString(notificationsAccountKey, serializedAccountJson);

  if (!accountPersisted) {
    throw std::runtime_error("Failed to persist notifications crypto account.");
  }
}

std::optional<std::pair<std::shared_ptr<crypto::CryptoModule>, std::string>>
NotificationsCryptoModule::fetchNotificationsAccount() {
  std::optional<std::string> serializedAccountJson;
  try {
    serializedAccountJson = CommMMKV::getString(notificationsAccountKey);
  } catch (const CommMMKV::InitFromNSEForbiddenError &e) {
    serializedAccountJson = std::nullopt;
  }

  if (!serializedAccountJson.has_value()) {
    return std::nullopt;
  }

  folly::dynamic serializedAccountObject;
  try {
    serializedAccountObject = folly::parseJson(serializedAccountJson.value());
  } catch (const folly::json::parse_error &e) {
    throw std::runtime_error(
        "Notifications account deserialization failed with reason: " +
        std::string(e.what()));
  }

  std::string picklingKey = serializedAccountObject["picklingKey"].asString();
  std::string accountString = serializedAccountObject["account"].asString();
  crypto::OlmBuffer account =
      crypto::OlmBuffer{accountString.begin(), accountString.end()};
  crypto::Persist serializedCryptoModule{account, {}};

  std::shared_ptr<crypto::CryptoModule> cryptoModule =
      std::make_shared<crypto::CryptoModule>(
          notificationsCryptoAccountID, picklingKey, serializedCryptoModule);

  return {{cryptoModule, picklingKey}};
}

void NotificationsCryptoModule::persistNotificationsSession(
    const std::string &keyserverID,
    std::shared_ptr<crypto::Session> keyserverNotificationsSession) {
  std::string picklingKey = crypto::Tools::generateRandomString(64);
  NotificationsCryptoModule::persistNotificationsSessionInternal(
      true, keyserverID, picklingKey, keyserverNotificationsSession);
}

void NotificationsCryptoModule::persistDeviceNotificationsSession(
    const std::string &deviceID,
    std::shared_ptr<crypto::Session> peerNotificationsSession) {
  std::string picklingKey = crypto::Tools::generateRandomString(64);
  NotificationsCryptoModule::persistNotificationsSessionInternal(
      false, deviceID, picklingKey, peerNotificationsSession);
}

bool NotificationsCryptoModule::isNotificationsSessionInitialized(
    const std::string &keyserverID) {
  std::string keyserverNotificationsSessionKey =
      getKeyserverNotificationsSessionKey(keyserverID);
  return CommMMKV::getString(keyserverNotificationsSessionKey).has_value();
}

bool NotificationsCryptoModule::isDeviceNotificationsSessionInitialized(
    const std::string &deviceID) {
  std::string peerNotificationsSessionKey =
      getDeviceNotificationsSessionKey(deviceID);
  return CommMMKV::getString(peerNotificationsSessionKey).has_value();
}

// notifications account

bool NotificationsCryptoModule::isNotificationsAccountInitialized() {
  return fetchNotificationsAccount().has_value();
}

std::string NotificationsCryptoModule::getIdentityKeys() {
  auto cryptoModuleWithPicklingKey =
      NotificationsCryptoModule::fetchNotificationsAccount();
  if (!cryptoModuleWithPicklingKey.has_value()) {
    throw std::runtime_error("Notifications crypto account not initialized.");
  }
  return cryptoModuleWithPicklingKey.value().first->getIdentityKeys();
}

NotificationsCryptoModule::BaseStatefulDecryptResult::BaseStatefulDecryptResult(
    std::string picklingKey,
    std::string decryptedData)
    : picklingKey(picklingKey), decryptedData(decryptedData) {
}

std::string
NotificationsCryptoModule::BaseStatefulDecryptResult::getDecryptedData() {
  return this->decryptedData;
}

NotificationsCryptoModule::StatefulDecryptResult::StatefulDecryptResult(
    std::unique_ptr<crypto::Session> session,
    std::string keyserverID,
    std::string picklingKey,
    std::string decryptedData)
    : NotificationsCryptoModule::BaseStatefulDecryptResult::
          BaseStatefulDecryptResult(picklingKey, decryptedData),
      sessionState(std::move(session)),
      keyserverID(keyserverID) {
}

void NotificationsCryptoModule::StatefulDecryptResult::flushState() {
  NotificationsCryptoModule::persistNotificationsSessionInternal(
      true,
      this->keyserverID,
      this->picklingKey,
      std::move(this->sessionState));
}

NotificationsCryptoModule::LegacyStatefulDecryptResult::
    LegacyStatefulDecryptResult(
        std::unique_ptr<crypto::CryptoModule> cryptoModule,
        std::string path,
        std::string picklingKey,
        std::string decryptedData)
    : NotificationsCryptoModule::BaseStatefulDecryptResult::
          BaseStatefulDecryptResult(picklingKey, decryptedData),
      path(path),
      cryptoModule(std::move(cryptoModule)) {
}

void NotificationsCryptoModule::LegacyStatefulDecryptResult::flushState() {
  std::shared_ptr<crypto::Session> legacyNotificationsSession =
      this->cryptoModule->getSessionByDeviceId(keyserverHostedNotificationsID);
  NotificationsCryptoModule::serializeAndFlushCryptoModule(
      std::move(this->cryptoModule), this->path, this->picklingKey);
  try {
    NotificationsCryptoModule::persistNotificationsSession(
        ashoatKeyserverIDUsedOnlyForMigrationFromLegacyNotifStorage,
        legacyNotificationsSession);
  } catch (const CommMMKV::InitFromNSEForbiddenError &e) {
    return;
  }
}

std::unique_ptr<NotificationsCryptoModule::BaseStatefulDecryptResult>
NotificationsCryptoModule::prepareLegacyDecryptedState(
    const std::string &data,
    const size_t messageType) {
  folly::Optional<std::string> picklingKey = comm::CommSecureStore::get(
      NotificationsCryptoModule::secureStoreNotificationsAccountDataKey);

  if (!picklingKey.hasValue()) {
    throw std::runtime_error(
        "Legacy notifications session pickling key missing.");
  }

  std::string legacyNotificationsAccountPath =
      comm::PlatformSpecificTools::getNotificationsCryptoAccountPath();

  crypto::EncryptedData encryptedData{
      std::vector<uint8_t>(data.begin(), data.end()), messageType};

  auto cryptoModule = NotificationsCryptoModule::deserializeCryptoModule(
      legacyNotificationsAccountPath, picklingKey.value());

  std::string decryptedData = cryptoModule->decrypt(
      NotificationsCryptoModule::keyserverHostedNotificationsID, encryptedData);

  LegacyStatefulDecryptResult statefulDecryptResult(
      std::move(cryptoModule),
      legacyNotificationsAccountPath,
      picklingKey.value(),
      decryptedData);

  return std::make_unique<LegacyStatefulDecryptResult>(
      std::move(statefulDecryptResult));
}

std::string NotificationsCryptoModule::decrypt(
    const std::string &keyserverID,
    const std::string &data,
    const size_t messageType) {

  auto sessionWithPicklingKey =
      NotificationsCryptoModule::fetchNotificationsSession(true, keyserverID);
  if (!sessionWithPicklingKey.has_value()) {
    auto statefulDecryptResult =
        NotificationsCryptoModule::prepareLegacyDecryptedState(
            data, messageType);
    statefulDecryptResult->flushState();
    return statefulDecryptResult->getDecryptedData();
  }

  std::unique_ptr<crypto::Session> session =
      std::move(sessionWithPicklingKey.value().first);
  std::string picklingKey = sessionWithPicklingKey.value().second;
  crypto::EncryptedData encryptedData{
      std::vector<uint8_t>(data.begin(), data.end()), messageType};

  std::string decryptedData = session->decrypt(encryptedData);
  NotificationsCryptoModule::persistNotificationsSessionInternal(
      true, keyserverID, picklingKey, std::move(session));
  return decryptedData;
}

crypto::EncryptedData NotificationsCryptoModule::encrypt(
    const std::string &deviceID,
    const std::string &payload) {
  auto sessionWithPicklingKey =
      NotificationsCryptoModule::fetchNotificationsSession(false, deviceID);
  if (!sessionWithPicklingKey.has_value()) {
    throw std::runtime_error(
        "Session with deviceID: " + deviceID + " not initialized.");
  }
  std::unique_ptr<crypto::Session> session =
      std::move(sessionWithPicklingKey.value().first);
  std::string picklingKey = sessionWithPicklingKey.value().second;
  crypto::EncryptedData encryptedData = session->encrypt(payload);
  NotificationsCryptoModule::persistNotificationsSessionInternal(
      false, deviceID, picklingKey, std::move(session));
  return encryptedData;
}

std::unique_ptr<NotificationsCryptoModule::BaseStatefulDecryptResult>
NotificationsCryptoModule::statefulDecrypt(
    const std::string &keyserverID,
    const std::string &data,
    const size_t messageType) {

  auto sessionWithPicklingKey =
      NotificationsCryptoModule::fetchNotificationsSession(true, keyserverID);
  if (!sessionWithPicklingKey.has_value()) {
    return NotificationsCryptoModule::prepareLegacyDecryptedState(
        data, messageType);
  }

  std::unique_ptr<crypto::Session> session =
      std::move(sessionWithPicklingKey.value().first);
  std::string picklingKey = sessionWithPicklingKey.value().second;
  crypto::EncryptedData encryptedData{
      std::vector<uint8_t>(data.begin(), data.end()), messageType};
  std::string decryptedData = session->decrypt(encryptedData);
  StatefulDecryptResult statefulDecryptResult(
      std::move(session), keyserverID, picklingKey, decryptedData);

  return std::make_unique<StatefulDecryptResult>(
      std::move(statefulDecryptResult));
}

void NotificationsCryptoModule::flushState(
    std::unique_ptr<BaseStatefulDecryptResult> baseStatefulDecryptResult) {
  baseStatefulDecryptResult->flushState();
}
} // namespace comm
