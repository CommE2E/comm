#pragma once

#include "SQLiteDataConverters.h"
#include <sqlite3.h>
#include <string>

namespace comm {

struct SQLiteQueuedDMOperation {
  std::string queue_type;
  std::string queue_key;
  std::string operation_data;
  int64_t timestamp;

  static SQLiteQueuedDMOperation fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return SQLiteQueuedDMOperation{
        getStringFromSQLRow(sqlRow, idx),
        getStringFromSQLRow(sqlRow, idx + 1),
        getStringFromSQLRow(sqlRow, idx + 2),
        getInt64FromSQLRow(sqlRow, idx + 3),
    };
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    int err;

    int queue_type_index = sqlite3_bind_parameter_index(sql, ":queue_type");
    err = bindStringToSQL(queue_type, sql, queue_type_index);

    int queue_key_index = sqlite3_bind_parameter_index(sql, ":queue_key");
    err = bindStringToSQL(queue_key, sql, queue_key_index);

    int operation_data_index =
        sqlite3_bind_parameter_index(sql, ":operation_data");
    err = bindStringToSQL(operation_data, sql, operation_data_index);

    int timestamp_index = sqlite3_bind_parameter_index(sql, ":timestamp");
    err = bindInt64ToSQL(timestamp, sql, timestamp_index);

    return err;
  }
};

struct QueuedDMOperation {
  std::string queue_type;
  std::string queue_key;
  std::string operation_data;
  std::string timestamp;

  QueuedDMOperation() = default;

  QueuedDMOperation(
      const std::string &queue_type,
      const std::string &queue_key,
      const std::string &operation_data,
      const std::string &timestamp)
      : queue_type(queue_type),
        queue_key(queue_key),
        operation_data(operation_data),
        timestamp(timestamp) {
  }

  QueuedDMOperation(const SQLiteQueuedDMOperation &op) {
    queue_type = op.queue_type;
    queue_key = op.queue_key;
    operation_data = op.operation_data;
    timestamp = std::to_string(op.timestamp);
  }

  SQLiteQueuedDMOperation toSQLiteQueuedDMOperation() const {
    SQLiteQueuedDMOperation op;
    op.queue_type = queue_type;
    op.queue_key = queue_key;
    op.operation_data = operation_data;
    op.timestamp = std::stoll(timestamp);
    return op;
  }
};

} // namespace comm