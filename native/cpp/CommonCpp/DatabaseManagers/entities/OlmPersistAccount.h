#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct OlmPersistAccount {
  int id;
  std::string account_data;

  static OlmPersistAccount fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return OlmPersistAccount{
        getIntFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindIntToSQL(id, sql, idx);
    return bindStringToSQL(account_data, sql, idx + 1);
  }
};

} // namespace comm
