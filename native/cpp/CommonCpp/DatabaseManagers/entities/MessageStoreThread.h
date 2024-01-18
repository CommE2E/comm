#pragma once

#include <sqlite3.h>
#include <string>

namespace comm {

struct MessageStoreThread {
  std::string id;
  int start_reached;

  static MessageStoreThread fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return MessageStoreThread{
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx)),
        sqlite3_column_int(sqlRow, idx + 1),
    };
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    sqlite3_bind_text(sql, idx, id.c_str(), -1, SQLITE_STATIC);
    return sqlite3_bind_int(sql, idx + 1, start_reached);
  }
};

} // namespace comm
