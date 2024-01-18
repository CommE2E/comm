#pragma once

#include <sqlite3.h>
#include <string>

namespace comm {

struct Metadata {
  std::string name;
  std::string data;

  static Metadata fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return Metadata{
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx)),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 1))};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    sqlite3_bind_text(sql, idx, name.c_str(), -1, SQLITE_STATIC);
    return sqlite3_bind_text(sql, idx + 1, data.c_str(), -1, SQLITE_STATIC);
  }
};

} // namespace comm
