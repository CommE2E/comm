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
} // namespace comm
