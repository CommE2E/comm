#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {
struct DMOperation {
  std::string id;
  std::string type;
  std::string operation;

  static DMOperation fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return DMOperation{
        getStringFromSQLRow(sqlRow, idx),
        getStringFromSQLRow(sqlRow, idx + 1),
        getStringFromSQLRow(sqlRow, idx + 2)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    bindStringToSQL(type, sql, idx + 1);
    return bindStringToSQL(operation, sql, idx + 2);
  }
};

} // namespace comm
