#pragma once

#include "cxx.h"

namespace comm {

rust::String getBackupDirectoryPath();
rust::String
getBackupFilePath(rust::Str backupID, bool isAttachments, bool isVersion);
rust::String
getBackupLogFilePath(rust::Str backupID, rust::Str logID, bool isAttachments);
rust::String getBackupUserKeysFilePath(rust::Str backupID);
rust::String getSIWEBackupMessagePath(rust::Str backupID);
void createMainCompaction(
    rust::Str backupID,
    rust::Str mainCompactionEncryptionKey,
    rust::Str newLogEncryptionKey,
    size_t futureID);
void restoreFromMainCompaction(
    rust::Str mainCompactionPath,
    rust::Str mainCompactionEncryptionKey,
    rust::Str maxVersion,
    size_t futureID);
void restoreFromBackupLog(rust::Vec<std::uint8_t> backupLog, size_t futureID);
void setBackupID(rust::Str backupID, size_t futureID);
rust::String generateBackupDataKey();
rust::String generateBackupLogDataKey();

} // namespace comm
