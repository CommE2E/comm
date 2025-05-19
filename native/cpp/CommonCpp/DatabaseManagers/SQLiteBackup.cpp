#include "SQLiteBackup.h"

#include "SQLiteUtils.h"
#include "entities/EntityQueryHelpers.h"

#include <sqlite3.h>
#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>

namespace comm {

std::unordered_set<std::string> SQLiteBackup::tablesAllowlist = {
    "drafts",
    "threads",
    "message_store_threads",
    "users",
    "synced_metadata",
    "aux_users",
    "entries",
};

void SQLiteBackup::cleanupDatabaseExceptAllowlist(sqlite3 *db) {
  std::vector<std::string> tables = SQLiteUtils::getAllTableNames(db);

  std::ostringstream removeDeviceSpecificDataSQL;
  for (const auto &tableName : tables) {
    if (SQLiteBackup::tablesAllowlist.find(tableName) ==
        SQLiteBackup::tablesAllowlist.end()) {
      removeDeviceSpecificDataSQL << "DELETE FROM " << tableName << ";"
                                  << std::endl;
    }
  }

  std::string sqlQuery = removeDeviceSpecificDataSQL.str();
  if (!sqlQuery.empty()) {
    executeQuery(db, sqlQuery);
  }
}

} // namespace comm
