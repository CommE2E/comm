#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct IntegrityThreadHash {
  std::string id;
  int thread_hash;

  static IntegrityThreadHash fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return IntegrityThreadHash{
        getStringFromSQLRow(sqlRow, idx), getIntFromSQLRow(sqlRow, idx + 1)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    return bindIntToSQL(thread_hash, sql, idx + 1);
  }
};

} // namespace comm