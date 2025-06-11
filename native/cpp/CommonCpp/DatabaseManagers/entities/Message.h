#pragma once

#include "Media.h"
#include <sqlite3.h>
#include <memory>
#include <optional>
#include <string>
#include <vector>

namespace comm {

struct Message {
  std::string id;
  std::optional<std::string> local_id;
  std::string thread;
  std::string user;
  int type;
  std::optional<int> future_type;
  std::optional<std::string> content;
  int64_t time;

  static Message fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return Message{
        getStringFromSQLRow(sqlRow, idx),
        getOptionalStringFromSQLRow(sqlRow, idx + 1),
        getStringFromSQLRow(sqlRow, idx + 2),
        getStringFromSQLRow(sqlRow, idx + 3),
        getIntFromSQLRow(sqlRow, idx + 4),
        getOptionalIntFromSQLRow(sqlRow, idx + 5),
        getOptionalStringFromSQLRow(sqlRow, idx + 6),
        getInt64FromSQLRow(sqlRow, idx + 7)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    int err;

    int id_index = sqlite3_bind_parameter_index(sql, ":id");
    err = bindStringToSQL(id, sql, id_index);

    int local_id_index = sqlite3_bind_parameter_index(sql, ":local_id");
    if (local_id_index) {
      err = bindOptionalStringToSQL(local_id, sql, local_id_index);
    }

    int thread_index = sqlite3_bind_parameter_index(sql, ":thread");
    err = bindStringToSQL(thread, sql, thread_index);

    int user_index = sqlite3_bind_parameter_index(sql, ":user");
    err = bindStringToSQL(user, sql, user_index);

    int type_index = sqlite3_bind_parameter_index(sql, ":type");
    err = bindIntToSQL(type, sql, type_index);

    int future_type_index = sqlite3_bind_parameter_index(sql, ":future_type");
    if (future_type_index) {
      err = bindOptionalIntToSQL(future_type, sql, future_type_index);
    }

    int content_index = sqlite3_bind_parameter_index(sql, ":content");
    if (content_index) {
      err = bindOptionalStringToSQL(content, sql, content_index);
    }

    int time_index = sqlite3_bind_parameter_index(sql, ":time");
    err = bindInt64ToSQL(time, sql, time_index);

    return err;
  }
};

struct MessageEntity {
  Message message;
  std::vector<Media> medias;
};

} // namespace comm
