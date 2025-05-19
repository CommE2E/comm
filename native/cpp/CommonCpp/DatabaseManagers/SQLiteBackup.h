#pragma once

#include <sqlite3.h>
#include <string>
#include <unordered_set>

namespace comm {
class SQLiteBackup {
public:
  static std::unordered_set<std::string> tablesAllowlist;

  static void cleanupDatabaseExceptAllowlist(sqlite3 *db);
};
} // namespace comm
