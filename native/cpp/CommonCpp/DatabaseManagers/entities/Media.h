#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct Media {
  std::string id;
  std::string container;
  std::string thread;
  std::string uri;
  std::string type;
  std::string extras;

  static Media fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return Media{
        getStringFromSQLRow(sqlRow, idx),
        getStringFromSQLRow(sqlRow, idx + 1),
        getStringFromSQLRow(sqlRow, idx + 2),
        getStringFromSQLRow(sqlRow, idx + 3),
        getStringFromSQLRow(sqlRow, idx + 4),
        getStringFromSQLRow(sqlRow, idx + 5)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    bindStringToSQL(container, sql, idx + 1);
    bindStringToSQL(thread, sql, idx + 2);
    bindStringToSQL(uri, sql, idx + 3);
    bindStringToSQL(type, sql, idx + 4);
    return bindStringToSQL(extras, sql, idx + 5);
  }
};

} // namespace comm
