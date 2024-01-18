#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct MessageStoreThread {
  std::string id;
  int start_reached;

  static MessageStoreThread fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return MessageStoreThread{
        getStringFromSQLRow(sqlRow, idx),
        getIntFromSQLRow(sqlRow, idx + 1),
    };
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    return bindIntToSQL(start_reached, sql, idx + 1);
  }
};

} // namespace comm
