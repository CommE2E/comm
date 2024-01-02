#pragma once

#include "../CryptoTools/Tools.h"

namespace comm {

class PlatformSpecificTools {
public:
  static void generateSecureRandomBytes(crypto::OlmBuffer &buffer, size_t size);
  static std::string getDeviceOS();
  static std::string getNotificationsCryptoAccountPath();
  static std::string
  getBackupFilePath(std::string backupID, bool isAttachments);
  static void removeBackupDirectory();
};

} // namespace comm
