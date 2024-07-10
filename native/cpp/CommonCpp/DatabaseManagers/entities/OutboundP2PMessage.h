#pragma once

#include <sqlite3.h>
#include <memory>
#include <string>

#include "SQLiteDataConverters.h"

namespace comm {

struct SQLiteOutboundP2PMessage {
  std::string message_id;
  std::string device_id;
  std::string user_id;
  int64_t timestamp;
  std::string plaintext;
  std::string ciphertext;
  std::string status;
  int automatically_retried;

  static SQLiteOutboundP2PMessage fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return SQLiteOutboundP2PMessage{
        getStringFromSQLRow(sqlRow, idx),
        getStringFromSQLRow(sqlRow, idx + 1),
        getStringFromSQLRow(sqlRow, idx + 2),
        getInt64FromSQLRow(sqlRow, idx + 3),
        getStringFromSQLRow(sqlRow, idx + 4),
        getStringFromSQLRow(sqlRow, idx + 5),
        getStringFromSQLRow(sqlRow, idx + 6),
        getIntFromSQLRow(sqlRow, idx + 7),
    };
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(message_id, sql, idx);
    bindStringToSQL(device_id, sql, idx + 1);
    bindStringToSQL(user_id, sql, idx + 2);
    bindInt64ToSQL(timestamp, sql, idx + 3);
    bindStringToSQL(plaintext, sql, idx + 4);
    bindStringToSQL(ciphertext, sql, idx + 5);
    bindStringToSQL(status, sql, idx + 6);
    return bindIntToSQL(automatically_retried, sql, idx + 7);
  }
};

struct OutboundP2PMessage {
  std::string message_id;
  std::string device_id;
  std::string user_id;
  std::string timestamp;
  std::string plaintext;
  std::string ciphertext;
  std::string status;
  std::string automatically_retried;

  OutboundP2PMessage() = default;

  OutboundP2PMessage(
      const std::string &message_id,
      const std::string &device_id,
      const std::string &user_id,
      const std::string &timestamp,
      const std::string &plaintext,
      const std::string &ciphertext,
      const std::string &status,
      const std::string &automatically_retried)
      : message_id(message_id),
        device_id(device_id),
        user_id(user_id),
        timestamp(timestamp),
        plaintext(plaintext),
        ciphertext(ciphertext),
        status(status),
        automatically_retried(automatically_retried) {
  }

  OutboundP2PMessage(const SQLiteOutboundP2PMessage &msg) {
    message_id = msg.message_id;
    device_id = msg.device_id;
    user_id = msg.user_id;
    timestamp = std::to_string(msg.timestamp);
    plaintext = msg.plaintext;
    ciphertext = msg.ciphertext;
    status = msg.status;
    automatically_retried = std::to_string(msg.automatically_retried);
  }

  SQLiteOutboundP2PMessage toSQLiteOutboundP2PMessage() const {
    SQLiteOutboundP2PMessage msg;
    msg.message_id = message_id;
    msg.device_id = device_id;
    msg.user_id = user_id;
    msg.timestamp = std::stoll(timestamp);
    msg.plaintext = plaintext;
    msg.ciphertext = ciphertext;
    msg.status = status;
    msg.automatically_retried = std::stoi(automatically_retried);
    return msg;
  }
};

} // namespace comm
