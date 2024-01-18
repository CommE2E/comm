#pragma once

#include <sqlite3.h>
#include <string>

namespace comm {

struct Report {
  std::string id;
  std::string report;

  static Report fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return Report{
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx)),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 1))};
  }
};

} // namespace comm
