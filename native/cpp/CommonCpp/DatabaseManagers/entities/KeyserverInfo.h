#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct KeyserverInfo {
  std::string id;
  std::string keyserver_info;
  std::string synced_keyserver_info;

  static KeyserverInfo fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return KeyserverInfo{
        getStringFromSQLRow(sqlRow, idx),
        getStringFromSQLRow(sqlRow, idx + 1),
        getStringFromSQLRow(sqlRow, idx + 2)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    int err;

    int id_index = sqlite3_bind_parameter_index(sql, ":id");
    err = bindStringToSQL(id, sql, id_index);

    int keyserver_info_index =
        sqlite3_bind_parameter_index(sql, ":keyserver_info");
    if (keyserver_info_index) {
      err = bindStringToSQL(keyserver_info, sql, keyserver_info_index);
    }

    int synced_keyserver_info_index =
        sqlite3_bind_parameter_index(sql, ":synced_keyserver_info");
    if (synced_keyserver_info_index) {
      err = bindStringToSQL(
          synced_keyserver_info, sql, synced_keyserver_info_index);
    }

    return err;
  }
};

} // namespace comm
