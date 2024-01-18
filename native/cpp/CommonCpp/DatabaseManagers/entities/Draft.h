#pragma once

#include <sqlite3.h>
#include <string>

namespace comm {

struct Draft {
  std::string key;
  std::string text;

  static Draft fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return Draft{
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx)),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 1))};
  }
};

} // namespace comm
