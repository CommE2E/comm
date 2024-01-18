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

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    bindStringPtrToSQL(local_id, sql, idx + 1);
    bindStringToSQL(thread, sql, idx + 2);
    bindStringToSQL(user, sql, idx + 3);
    bindIntToSQL(type, sql, idx + 4);
    bindIntPtrToSQL(future_type, sql, idx + 5);
    bindStringPtrToSQL(content, sql, idx + 6);
    return bindInt64ToSQL(time, sql, idx + 7);
  }
};

} // namespace comm
