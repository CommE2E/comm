#pragma once

#include "cxx.h"

namespace comm {

rust::String getBackupDirectoryPath();
rust::String getBackupFilePath(rust::String backupID, bool isAttachments);
void createMainCompaction(rust::String backupID);
void restoreFromMainCompaction(
    rust::String mainCompactionPath,
    rust::String mainCompactionEncryptionKey);

} // namespace comm
