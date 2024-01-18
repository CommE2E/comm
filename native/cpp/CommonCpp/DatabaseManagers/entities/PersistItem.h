#pragma once

#include <sqlite3.h>
#include <string>

namespace comm {

struct PersistItem {
  std::string key;
  std::string item;

  static PersistItem fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return PersistItem{
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx)),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 1))};
  }
};

} // namespace comm
