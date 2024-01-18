#pragma once

#include <sqlite3.h>
#include <string>

namespace comm {

struct UserInfo {
  std::string id;
  std::string user_info;

  static UserInfo fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return UserInfo{
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx)),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 1))};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    sqlite3_bind_text(sql, idx, id.c_str(), -1, SQLITE_STATIC);
    return sqlite3_bind_text(
        sql, idx + 1, user_info.c_str(), -1, SQLITE_STATIC);
  }
};

} // namespace comm
