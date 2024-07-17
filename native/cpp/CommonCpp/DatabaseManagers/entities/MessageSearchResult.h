#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct MessageSearchResult {
  std::string original_message_id;
  std::string message_id;
  std::string processed_content;

  static MessageSearchResult fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return MessageSearchResult{
        getStringFromSQLRow(sqlRow, idx),
        getStringFromSQLRow(sqlRow, idx + 1),
        getStringFromSQLRow(sqlRow, idx + 2)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(original_message_id, sql, idx);
    bindStringToSQL(message_id, sql, idx + 1);
    return bindStringToSQL(processed_content, sql, idx + 2);
  }
};

} // namespace comm
