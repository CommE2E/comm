#include "SQLiteDataConverters.h"

namespace comm {
std::string getStringFromSQLRow(sqlite3_stmt *sqlRow, int idx) {
  return reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx));
}

int getIntFromSQLRow(sqlite3_stmt *sqlRow, int idx) {
  return sqlite3_column_int(sqlRow, idx);
}

std::optional<std::string>
getOptionalStringFromSQLRow(sqlite3_stmt *sqlRow, int idx) {
  const char *maybeString =
      reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx));
  if (!maybeString) {
    return std::nullopt;
  }
  return std::string(maybeString);
}

std::optional<int> getOptionalIntFromSQLRow(sqlite3_stmt *sqlRow, int idx) {
  if (sqlite3_column_type(sqlRow, idx) == SQLITE_NULL) {
    return std::nullopt;
  }
  return sqlite3_column_int(sqlRow, idx);
}

int64_t getInt64FromSQLRow(sqlite3_stmt *sqlRow, int idx) {
  return sqlite3_column_int64(sqlRow, idx);
}

int bindStringToSQL(const std::string &data, sqlite3_stmt *sql, int idx) {
  return sqlite3_bind_text(sql, idx, data.c_str(), -1, SQLITE_TRANSIENT);
}

int bindOptionalStringToSQL(
    const std::optional<std::string> &data,
    sqlite3_stmt *sql,
    int idx) {
  if (!data.has_value()) {
    return sqlite3_bind_null(sql, idx);
  }
  return sqlite3_bind_text(sql, idx, data->c_str(), -1, SQLITE_TRANSIENT);
}

int bindIntToSQL(int data, sqlite3_stmt *sql, int idx) {
  return sqlite3_bind_int(sql, idx, data);
}

int bindOptionalIntToSQL(
    const std::optional<int> &data,
    sqlite3_stmt *sql,
    int idx) {
  if (!data.has_value()) {
    return sqlite3_bind_null(sql, idx);
  }
  return sqlite3_bind_int(sql, idx, *data);
}

int bindInt64ToSQL(int64_t data, sqlite3_stmt *sql, int idx) {
  return sqlite3_bind_int64(sql, idx, data);
}
} // namespace comm
