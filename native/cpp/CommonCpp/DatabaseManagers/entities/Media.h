#pragma once

#include <sqlite3.h>
#include <string>

namespace comm {

struct Media {
  std::string id;
  std::string container;
  std::string thread;
  std::string uri;
  std::string type;
  std::string extras;

  static Media fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return Media{
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx)),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 1)),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 2)),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 3)),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 4)),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 5))};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    sqlite3_bind_text(sql, idx, id.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(sql, idx + 1, container.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(sql, idx + 2, thread.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(sql, idx + 3, uri.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(sql, idx + 4, type.c_str(), -1, SQLITE_STATIC);
    return sqlite3_bind_text(sql, idx + 5, extras.c_str(), -1, SQLITE_STATIC);
  }
};

} // namespace comm
