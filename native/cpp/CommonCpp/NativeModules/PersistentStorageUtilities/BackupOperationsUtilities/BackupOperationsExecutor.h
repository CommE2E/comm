#pragma once

#include <string>

namespace comm {
class BackupOperationsExecutor {
public:
  static void createMainCompaction(std::string backupID);
  static void restoreFromMainCompaction(
      std::string mainCompactionPath,
      std::string mainCompactionEncryptionKey);
};
} // namespace comm
