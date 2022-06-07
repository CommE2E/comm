#pragma once

#include "../../../DatabaseManagers/entities/Thread.h"

#include <string>

namespace comm {
class ThreadOperations {
public:
  static void updateSQLiteUnreadStatus(std::string &threadID, bool unread);
};
} // namespace comm
