#pragma once

#include "StaffUtils.h"

namespace comm {

class ServicesUtils {
public:
  // If this is true, then the app is able to support User Data backup. After
  // restoring or secondary device login, the app will attempt to download
  // and apply compaction and logs. App is able to generate and upload
  // compaction and logs.
  // Keep in sync with lib/utils/services-utils.js
  static bool fullBackupSupport();
};

} // namespace comm
