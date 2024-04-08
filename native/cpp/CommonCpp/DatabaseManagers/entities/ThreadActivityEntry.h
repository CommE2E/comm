#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct ThreadActivityEntry {
  std::string id;
  std::string thread_activity_store_entry;

  static ThreadActivityEntry fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return ThreadActivityEntry{
        getStringFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    return bindStringToSQL(thread_activity_store_entry, sql, idx + 1);
  }
};

} // namespace comm
