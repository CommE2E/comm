#pragma once

#include <string>
#include <vector>

namespace comm {
class BackupOperationsExecutor {
public:
  static void createMainCompaction(std::string backupID);
  static void restoreFromMainCompaction(
      std::string mainCompactionPath,
      std::string mainCompactionEncryptionKey);
  static void restoreFromBackupLog(const std::vector<std::uint8_t> &backupLog);
};
} // namespace comm
