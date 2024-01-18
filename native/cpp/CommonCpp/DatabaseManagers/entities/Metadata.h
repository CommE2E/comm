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
};

} // namespace comm
