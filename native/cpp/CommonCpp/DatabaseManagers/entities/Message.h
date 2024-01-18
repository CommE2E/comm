#pragma once

#include <sqlite3.h>
#include <memory>
#include <string>

namespace comm {

struct Message {
  std::string id;
  std::unique_ptr<std::string> local_id;
  std::string thread;
  std::string user;
  int type;
  std::unique_ptr<int> future_type;
  std::unique_ptr<std::string> content;
  int64_t time;

  static Message fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    const char *local_id =
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 1));
    const char *content =
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 6));

    std::unique_ptr<int> future_type;
    if (sqlite3_column_type(sqlRow, idx + 5) == SQLITE_NULL) {
      future_type = nullptr;
    } else {
      future_type = std::make_unique<int>(sqlite3_column_int(sqlRow, idx + 5));
    }

    return Message{
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx)),
        local_id ? std::make_unique<std::string>(local_id) : nullptr,
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 2)),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 3)),
        sqlite3_column_int(sqlRow, idx + 4),
        std::move(future_type),
        content ? std::make_unique<std::string>(content) : nullptr,
        sqlite3_column_int64(sqlRow, idx + 7)};
  }
};

} // namespace comm
