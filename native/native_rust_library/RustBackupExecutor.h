#pragma once

#include "cxx.h"

namespace comm {

rust::String getBackupDirectoryPath();
rust::String getBackupFilePath(rust::String backupID, bool isAttachments);

} // namespace comm
