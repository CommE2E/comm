#pragma once

#include <sqlite3.h>
#include <string>

namespace comm {

struct OlmPersistAccount {
  int id;
  std::string account_data;

  static OlmPersistAccount fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return OlmPersistAccount{
        sqlite3_column_int(sqlRow, idx),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 1))};
  }
};

} // namespace comm
