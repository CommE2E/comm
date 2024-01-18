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
};

} // namespace comm
