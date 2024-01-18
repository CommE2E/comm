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
  };
};

} // namespace comm
