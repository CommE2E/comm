#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct Metadata {
  std::string name;
  std::string data;

  static Metadata fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return Metadata{
        getStringFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(name, sql, idx);
    return bindStringToSQL(data, sql, idx + 1);
  }
};

} // namespace comm
