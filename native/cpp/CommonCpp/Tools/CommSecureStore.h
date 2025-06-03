#pragma once

#include <folly/Optional.h>

#include <string>

namespace comm {

class CommSecureStore {
public:
  static void set(const std::string key, const std::string value);
  static folly::Optional<std::string> get(const std::string key);
  // Should match constant defined in `native_rust_library/src/constants.rs`
  inline static const std::string commServicesAccessToken = "accessToken";
  inline static const std::string userID = "userID";
  inline static const std::string deviceID = "deviceID";
  inline static const std::string backupDataKey = "comm.encryptionKey";
  inline static const std::string backupLogDataKey =
      "comm.backupLogsEncryptionKey";
  inline static const std::string restoredBackupPath =
      "comm.restoredBackupPath";
  inline static const std::string restoredBackupDataKey =
      "comm.restoredBackupDataKey";
};

} // namespace comm
