#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct KeyserverInfo {
  std::string id;
  std::string keyserver_info;

  static KeyserverInfo fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return KeyserverInfo{
        getStringFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    return bindStringToSQL(keyserver_info, sql, idx + 1);
  }
};

} // namespace comm
