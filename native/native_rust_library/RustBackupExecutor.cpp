#include "RustBackupExecutor.h"
#include "../cpp/CommonCpp/NativeModules/PersistentStorageUtilities/BackupOperationsUtilities/BackupOperationsExecutor.h"
#include "../cpp/CommonCpp/Tools/PlatformSpecificTools.h"

#include <string>

namespace comm {

rust::String getBackupDirectoryPath() {
  return rust::String(PlatformSpecificTools::getBackupDirectoryPath());
}

rust::String getBackupFilePath(rust::String backupID, bool isAttachments) {
  return rust::String(PlatformSpecificTools::getBackupFilePath(
      std::string(backupID), isAttachments));
}

void createMainCompaction(rust::String backupID) {
  BackupOperationsExecutor::createMainCompaction(std::string(backupID));
}

void restoreFromMainCompaction(
    rust::String mainCompactionPath,
    rust::String mainCompactionEncryptionKey) {
  BackupOperationsExecutor::restoreFromMainCompaction(
      std::string(mainCompactionPath),
      std::string(mainCompactionEncryptionKey));
}
} // namespace comm
