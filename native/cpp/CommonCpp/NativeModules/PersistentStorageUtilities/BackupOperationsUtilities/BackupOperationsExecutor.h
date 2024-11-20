#pragma once

#include <string>
#include <vector>

namespace comm {
class BackupOperationsExecutor {
public:
  static void createMainCompaction(std::string backupID, size_t futureID);
  static void restoreFromMainCompaction(
      std::string mainCompactionPath,
      std::string mainCompactionEncryptionKey,
      std::string maxVersion,
      size_t futureID);
  static void restoreFromBackupLog(
      const std::vector<std::uint8_t> &backupLog,
      size_t futureID);
  static void setBackupID(std::string backupID, size_t futureID);
};
} // namespace comm
