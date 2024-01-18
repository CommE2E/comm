#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct PersistItem {
  std::string key;
  std::string item;

  static PersistItem fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return PersistItem{
        getStringFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(key, sql, idx);
    return bindStringToSQL(item, sql, idx + 1);
  }
};

} // namespace comm
