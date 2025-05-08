#pragma once

#include <sqlite3.h>
#include <memory>
#include <optional>
#include <string>

#include "SQLiteDataConverters.h"

namespace comm {

struct Thread {
  std::string id;
  int type;
  std::optional<std::string> name;
  std::optional<std::string> description;
  std::string color;
  int64_t creation_time;
  std::optional<std::string> parent_thread_id;
  std::optional<std::string> containing_thread_id;
  std::optional<std::string> community;
  std::string members;
  std::string roles;
  std::string current_user;
  std::optional<std::string> source_message_id;
  int replies_count;
  std::optional<std::string> avatar;
  int pinned_count;
  std::optional<std::string> timestamps;

  static Thread fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return Thread{
        getStringFromSQLRow(sqlRow, idx),
        getIntFromSQLRow(sqlRow, idx + 1),
        getOptionalStringFromSQLRow(sqlRow, idx + 2),
        getOptionalStringFromSQLRow(sqlRow, idx + 3),
        getStringFromSQLRow(sqlRow, idx + 4),
        getInt64FromSQLRow(sqlRow, idx + 5),
        getOptionalStringFromSQLRow(sqlRow, idx + 6),
        getOptionalStringFromSQLRow(sqlRow, idx + 7),
        getOptionalStringFromSQLRow(sqlRow, idx + 8),
        getStringFromSQLRow(sqlRow, idx + 9),
        getStringFromSQLRow(sqlRow, idx + 10),
        getStringFromSQLRow(sqlRow, idx + 11),
        getOptionalStringFromSQLRow(sqlRow, idx + 12),
        getIntFromSQLRow(sqlRow, idx + 13),
        getOptionalStringFromSQLRow(sqlRow, idx + 14),
        getIntFromSQLRow(sqlRow, idx + 15),
        getOptionalStringFromSQLRow(sqlRow, idx + 16),
    };
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    bindIntToSQL(type, sql, idx + 1);
    bindOptionalStringToSQL(name, sql, idx + 2);
    bindOptionalStringToSQL(description, sql, idx + 3);
    bindStringToSQL(color, sql, idx + 4);
    bindInt64ToSQL(creation_time, sql, idx + 5);
    bindOptionalStringToSQL(parent_thread_id, sql, idx + 6);
    bindOptionalStringToSQL(containing_thread_id, sql, idx + 7);
    bindOptionalStringToSQL(community, sql, idx + 8);
    bindStringToSQL(members, sql, idx + 9);
    bindStringToSQL(roles, sql, idx + 10);
    bindStringToSQL(current_user, sql, idx + 11);
    bindOptionalStringToSQL(source_message_id, sql, idx + 12);
    bindIntToSQL(replies_count, sql, idx + 13);
    bindOptionalStringToSQL(avatar, sql, idx + 14);
    bindIntToSQL(pinned_count, sql, idx + 15);
    return bindOptionalStringToSQL(timestamps, sql, idx + 16);
  }
};

} // namespace comm
