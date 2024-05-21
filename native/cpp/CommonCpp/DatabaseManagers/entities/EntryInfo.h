#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {
struct EntryInfo {
  std::string id;
  std::string entry;

  static EntryInfo fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return EntryInfo{
        getStringFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  };

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    return bindStringToSQL(entry, sql, idx + 1);
  }
};

} // namespace comm
