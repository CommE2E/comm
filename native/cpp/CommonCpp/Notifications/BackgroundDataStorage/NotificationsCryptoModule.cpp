#include "NotificationsCryptoModule.h"
#include "../../CryptoTools/Persist.h"
#include "../../CryptoTools/Tools.h"
#include "../../Tools/CommSecureStore.h"
#include "../../Tools/PlatformSpecificTools.h"

#include <fcntl.h>
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
} // namespace comm
