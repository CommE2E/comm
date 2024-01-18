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
};

} // namespace comm
