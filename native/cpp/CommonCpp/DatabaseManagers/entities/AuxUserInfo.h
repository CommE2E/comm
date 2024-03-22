#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct AuxUserInfo {
  std::string id;
  std::string aux_user_info;

  static AuxUserInfo fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return AuxUserInfo{
        getStringFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    return bindStringToSQL(aux_user_info, sql, idx + 1);
  }
};

} // namespace comm