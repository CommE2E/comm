#pragma once

#include <sqlite3.h>
#include <memory>
#include <string>

#include "SQLiteDataConverters.h"

namespace comm {

struct InboundP2PMessage {
  std::string message_id;
  std::string sender_device_id;
  std::string plaintext;
  std::string status;
  std::string sender_user_id;

  static InboundP2PMessage fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return InboundP2PMessage{
        getStringFromSQLRow(sqlRow, idx),
        getStringFromSQLRow(sqlRow, idx + 1),
        getStringFromSQLRow(sqlRow, idx + 2),
        getStringFromSQLRow(sqlRow, idx + 3),
        getStringFromSQLRow(sqlRow, idx + 4),
    };
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(message_id, sql, idx);
    bindStringToSQL(sender_device_id, sql, idx + 1);
    bindStringToSQL(plaintext, sql, idx + 2);
    bindStringToSQL(status, sql, idx + 3);
    return bindStringToSQL(sender_user_id, sql, idx + 4);
  }
};

} // namespace comm
