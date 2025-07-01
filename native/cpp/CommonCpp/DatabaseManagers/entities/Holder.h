#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct Holder {
  std::string hash;
  std::string holder;
  std::string status;

  static Holder fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return Holder{
        getStringFromSQLRow(sqlRow, idx),
        getStringFromSQLRow(sqlRow, idx + 1),
        getStringFromSQLRow(sqlRow, idx + 2)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    int err;

    int hash_index = sqlite3_bind_parameter_index(sql, ":hash");
    err = bindStringToSQL(hash, sql, hash_index);

    int holder_index = sqlite3_bind_parameter_index(sql, ":holder");
    err = bindStringToSQL(holder, sql, holder_index);

    int status_index = sqlite3_bind_parameter_index(sql, ":status");
    err = bindStringToSQL(status, sql, status_index);

    return err;
  }
};

} // namespace comm
