#pragma once

#include "cxx.h"

namespace comm {

rust::String getBackupDirectoryPath();
rust::String getBackupFilePath(rust::Str backupID, bool isAttachments);
rust::String
getBackupLogFilePath(rust::Str backupID, rust::Str logID, bool isAttachments);
rust::String getBackupUserKeysFilePath(rust::Str backupID);
void createMainCompaction(rust::String backupID);
void restoreFromMainCompaction(
    rust::String mainCompactionPath,
    rust::String mainCompactionEncryptionKey);
void restoreFromBackupLog(rust::Vec<std::uint8_t> backupLog);

} // namespace comm
