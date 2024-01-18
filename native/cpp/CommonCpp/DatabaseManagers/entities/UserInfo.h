#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct UserInfo {
  std::string id;
  std::string user_info;

  static UserInfo fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return UserInfo{
        getStringFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  };
};

} // namespace comm
