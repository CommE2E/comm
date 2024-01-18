#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct Draft {
  std::string key;
  std::string text;

  static Draft fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return Draft{
        getStringFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  }
};

} // namespace comm
