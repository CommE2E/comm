#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct CommunityInfo {
  std::string id;
  std::string community_info;

  static CommunityInfo fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return CommunityInfo{
        getStringFromSQLRow(sqlRow, idx), getStringFromSQLRow(sqlRow, idx + 1)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    return bindStringToSQL(community_info, sql, idx + 1);
  }
};

} // namespace comm