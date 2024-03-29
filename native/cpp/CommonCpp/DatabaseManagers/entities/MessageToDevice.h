#pragma once

#include <sqlite3.h>
#include <memory>
#include <string>

#include "SQLiteDataConverters.h"

namespace comm {

struct MessageToDevice {
  std::string message_id;
  std::string device_id;
  std::string user_id;
  int64_t timestamp;
  std::string plaintext;
  std::string ciphertext;

  static MessageToDevice fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return MessageToDevice{
        getStringFromSQLRow(sqlRow, idx),
        getStringFromSQLRow(sqlRow, idx + 1),
        getStringFromSQLRow(sqlRow, idx + 2),
        getInt64FromSQLRow(sqlRow, idx + 3),
        getStringFromSQLRow(sqlRow, idx + 4),
        getStringFromSQLRow(sqlRow, idx + 5),
    };
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(message_id, sql, idx);
    bindStringToSQL(device_id, sql, idx + 1);
    bindStringToSQL(user_id, sql, idx + 2);
    bindInt64ToSQL(timestamp, sql, idx + 3);
    bindStringToSQL(plaintext, sql, idx + 4);
    return bindStringToSQL(ciphertext, sql, idx + 5);
  }
};

struct ClientMessageToDevice {
  std::string message_id;
  std::string device_id;
  std::string user_id;
  std::string timestamp;
  std::string plaintext;
  std::string ciphertext;

  ClientMessageToDevice() = default;

  ClientMessageToDevice(const MessageToDevice &msg) {
    message_id = msg.message_id;
    device_id = msg.device_id;
    user_id = msg.user_id;
    timestamp = std::to_string(msg.timestamp);
    plaintext = msg.plaintext;
    ciphertext = msg.ciphertext;
  }

  MessageToDevice toMessageToDevice() const {
    MessageToDevice msg;
    msg.message_id = message_id;
    msg.device_id = device_id;
    msg.user_id = user_id;
    msg.timestamp = std::stoll(timestamp);
    msg.plaintext = plaintext;
    msg.ciphertext = ciphertext;
    return msg;
  }
};

} // namespace comm
