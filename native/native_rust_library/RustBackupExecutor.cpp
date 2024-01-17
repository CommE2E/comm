#include "RustBackupExecutor.h"
#include "../cpp/CommonCpp/NativeModules/PersistentStorageUtilities/BackupOperationsUtilities/BackupOperationsExecutor.h"
#include "../cpp/CommonCpp/Tools/PlatformSpecificTools.h"

#include <string>

namespace comm {

rust::String getBackupDirectoryPath() {
  return rust::String(PlatformSpecificTools::getBackupDirectoryPath());
}

rust::String getBackupFilePath(rust::Str backupID, bool isAttachments) {
  return rust::String(PlatformSpecificTools::getBackupFilePath(
      std::string(backupID), isAttachments));
}

rust::String
getBackupLogFilePath(rust::Str backupID, rust::Str logID, bool isAttachments) {
  return rust::String(PlatformSpecificTools::getBackupLogFilePath(
      std::string(backupID), std::string(logID), isAttachments));
}

rust::String getBackupUserKeysFilePath(rust::Str backupID) {
  return rust::String(
      PlatformSpecificTools::getBackupUserKeysFilePath(std::string(backupID)));
}

void createMainCompaction(rust::Str backupID) {
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
