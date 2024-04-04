#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct OlmPersistSession {
  std::string target_device_id;
  std::string session_data;
  int version;

  static OlmPersistSession fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return OlmPersistSession{
        getStringFromSQLRow(sqlRow, idx),
        getStringFromSQLRow(sqlRow, idx + 1),
        getIntFromSQLRow(sqlRow, idx + 2)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(target_device_id, sql, idx);
    bindStringToSQL(session_data, sql, idx + 1);
    return bindIntToSQL(version, sql, idx + 2);
  }
};

} // namespace comm
