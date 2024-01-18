#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct OlmPersistSession {
  std::string target_user_id;
  std::string session_data;

  static OlmPersistSession fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return OlmPersistSession{
        getStringFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(target_user_id, sql, idx);
    return bindStringToSQL(session_data, sql, idx + 1);
  }
};

} // namespace comm
