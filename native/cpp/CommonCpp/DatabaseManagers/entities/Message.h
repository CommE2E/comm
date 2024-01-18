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
    return Message{
        getStringFromSQLRow(sqlRow, idx),
        getStringPtrFromSQLRow(sqlRow, idx + 1),
        getStringFromSQLRow(sqlRow, idx + 2),
        getStringFromSQLRow(sqlRow, idx + 3),
        getIntFromSQLRow(sqlRow, idx + 4),
        getIntPtrFromSQLRow(sqlRow, idx + 5),
        getStringPtrFromSQLRow(sqlRow, idx + 6),
        getInt64FromSQLRow(sqlRow, idx + 7)};
  }
};

} // namespace comm
