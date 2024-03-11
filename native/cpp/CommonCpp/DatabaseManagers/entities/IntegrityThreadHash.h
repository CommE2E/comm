#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct IntegrityThreadHash {
  std::string id;
  std::string thread_hash;

  static IntegrityThreadHash fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return IntegrityThreadHash{
        getStringFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    return bindStringToSQL(thread_hash, sql, idx + 1);
  }
};

} // namespace comm
