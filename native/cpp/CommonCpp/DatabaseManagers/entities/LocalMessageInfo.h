#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct LocalMessageInfo {
  std::string id;
  std::string local_message_info;

  static LocalMessageInfo fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return LocalMessageInfo{
        getStringFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    return bindStringToSQL(local_message_info, sql, idx + 1);
  }
};

} // namespace comm
