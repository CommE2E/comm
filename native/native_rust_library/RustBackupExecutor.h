#pragma once

#include "cxx.h"

namespace comm {

rust::String getBackupDirectoryPath();
rust::String getBackupFilePath(rust::Str backupID, bool isAttachments);
rust::String getBackupLogFilePath(
  rust::Str backupID,
  rust::Str logID,
  bool isAttachments);
rust::String getBackupUserKeysFilePath(rust::Str backupID);

} // namespace comm
