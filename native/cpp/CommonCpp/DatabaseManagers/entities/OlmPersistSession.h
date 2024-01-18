#pragma once

#include <sqlite3.h>
#include <string>

namespace comm {

struct OlmPersistSession {
  std::string target_user_id;
  std::string session_data;

  static OlmPersistSession fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return OlmPersistSession{
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx)),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 1))};
  }
};

} // namespace comm
