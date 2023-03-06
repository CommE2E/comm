#include "NotificationsCryptoModule.h"
#include "../../CryptoTools/Persist.h"
#include "../../CryptoTools/Tools.h"
#include "../../Tools/CommSecureStore.h"
#include "../../Tools/PlatformSpecificTools.h"

#include <fcntl.h>
#include <folly/Optional.h>
#include <folly/String.h>
#include <folly/dynamic.h>
#include <folly/json.h>
#include <unistd.h>
#include <fstream>
#include <sstream>

namespace comm {

const std::string
    NotificationsCryptoModule::secureStoreNotificationsAccountDataKey =
        "notificationsCryptoAccountDataKey";
const std::string NotificationsCryptoModule::notificationsCryptoAccountID =
    "notificationsCryptoAccountDataID";

crypto::CryptoModule NotificationsCryptoModule::deserializeCryptoModule(
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
    return crypto::CryptoModule{
        notificationsCryptoAccountID, picklingKey, {account, sessions}};
  }
  for (auto &sessionKeyValuePair : persistJSON["sessions"].items()) {
    std::string targetUserID = sessionKeyValuePair.first.asString();
    std::string sessionData = sessionKeyValuePair.second.asString();
    sessions[targetUserID] =
        std::vector<uint8_t>(sessionData.begin(), sessionData.end());
  }
  return crypto::CryptoModule{
      notificationsCryptoAccountID, picklingKey, {account, sessions}};
}

void NotificationsCryptoModule::serializeAndFlushCryptoModule(
    crypto::CryptoModule &cryptoModule,
    const std::string &path,
    const std::string &picklingKey,
    const std::string &callingProcessName) {
  crypto::Persist persist = cryptoModule.storeAsB64(picklingKey);

  folly::dynamic sessions = folly::dynamic::object;
  for (auto &sessionKeyValuePair : persist.sessions) {
    std::string targetUserID = sessionKeyValuePair.first;
    crypto::OlmBuffer sessionData = sessionKeyValuePair.second;
    sessions[targetUserID] =
        std::string(sessionData.begin(), sessionData.end());
  }

  std::string account =
      std::string(persist.account.begin(), persist.account.end());
  folly::dynamic persistJSON =
      folly::dynamic::object("account", account)("sessions", sessions);
  std::string pickledPersist = folly::toJson(persistJSON);

  std::string temporaryPath = path + callingProcessName;
  // This is for the case if any of the steps below failed/app was killed
  // in a previous call to this method leaving temporary file unremoved.
  // We supply `callingProcessName` as function argument in order to name
  // temporary file in a deterministic way. Otherwise we would need to use
  // directory search API to retrieve unremoved files paths.
  remove(temporaryPath.c_str());
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
}

void NotificationsCryptoModule::initializeNotificationsCryptoAccount(
    const std::string &callingProcessName) {
  const std::string notificationsCryptoAccountPath =
      PlatformSpecificTools::getNotificationsCryptoAccountPath();
  std::ifstream notificationCryptoAccountCheck(notificationsCryptoAccountPath);
  if (notificationCryptoAccountCheck.good()) {
    // Implemented in CommmCoreModule semantics regarding public olm account
    // initialization is idempotent. We should follow the same approach when it
    // comes to notifications
    notificationCryptoAccountCheck.close();
    return;
  }
  // There is no reason to check if the key is already present since if we are
  // in this place in the code we are about to create new account
  CommSecureStore secureStore{};
  std::string picklingKey = crypto::Tools::generateRandomString(64);
  secureStore.set(
      NotificationsCryptoModule::secureStoreNotificationsAccountDataKey,
      picklingKey);

  crypto::CryptoModule cryptoModule{
      NotificationsCryptoModule::notificationsCryptoAccountID};
  NotificationsCryptoModule::serializeAndFlushCryptoModule(
      cryptoModule,
      notificationsCryptoAccountPath,
      picklingKey,
      callingProcessName);
}

std::string NotificationsCryptoModule::getNotificationsIdentityKeys(
    const std::string &picklingKey) {
  const std::string path =
      PlatformSpecificTools::getNotificationsCryptoAccountPath();
  crypto::CryptoModule cryptoModule =
      NotificationsCryptoModule::deserializeCryptoModule(path, picklingKey);
  return cryptoModule.getIdentityKeys();
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
} // namespace comm
