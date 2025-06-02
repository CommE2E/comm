#pragma once

#include "../CryptoTools/Tools.h"

namespace comm {

class PlatformSpecificTools {
public:
  static void generateSecureRandomBytes(crypto::OlmBuffer &buffer, size_t size);
  static std::string getDeviceOS();
  static std::string getNotificationsCryptoAccountPath();
  static std::string getBackupDirectoryPath();
  static std::string
  getBackupFilePath(std::string backupID, bool isAttachments, bool isVersion);
  static std::string getBackupLogFilePath(
      std::string backupID,
      std::string logID,
      bool isAttachments);
  static std::string getBackupUserKeysFilePath(std::string backupID);
  static std::string getSIWEBackupMessagePath(std::string backupID);
  static void removeBackupDirectory();
};

} // namespace comm
