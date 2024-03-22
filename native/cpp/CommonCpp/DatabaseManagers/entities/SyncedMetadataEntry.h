#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct SyncedMetadataEntry {
  std::string name;
  std::string data;

  static SyncedMetadataEntry fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return SyncedMetadataEntry{
        getStringFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(name, sql, idx);
    return bindStringToSQL(data, sql, idx + 1);
  }
};

} // namespace comm
