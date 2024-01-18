#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct Report {
  std::string id;
  std::string report;

  static Report fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return Report{
        getStringFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    return bindStringToSQL(report, sql, idx + 1);
  }
};

} // namespace comm
