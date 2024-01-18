#pragma once

#include <sqlite3.h>
#include <string>

namespace comm {

struct OlmPersistAccount {
  int id;
  std::string account_data;

  static OlmPersistAccount fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return OlmPersistAccount{
        sqlite3_column_int(sqlRow, idx),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 1))};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    sqlite3_bind_int(sql, idx, id);
    return sqlite3_bind_text(
        sql, idx + 1, account_data.c_str(), -1, SQLITE_STATIC);
  }
};

} // namespace comm
