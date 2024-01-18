#include "SQLiteDataConverters.h"

namespace comm {
std::string getStringFromSQLRow(sqlite3_stmt *sqlRow, int idx) {
  return reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx));
}

int getIntFromSQLRow(sqlite3_stmt *sqlRow, int idx) {
  return sqlite3_column_int(sqlRow, idx);
}

std::unique_ptr<std::string>
getStringPtrFromSQLRow(sqlite3_stmt *sqlRow, int idx) {
  const char *maybeString =
      reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx));
  if (!maybeString) {
    return nullptr;
  }
  return std::make_unique<std::string>(maybeString);
}

std::unique_ptr<int> getIntPtrFromSQLRow(sqlite3_stmt *sqlRow, int idx) {
  if (sqlite3_column_type(sqlRow, idx) == SQLITE_NULL) {
    return nullptr;
  }
  return std::make_unique<int>(sqlite3_column_int(sqlRow, idx));
}

int64_t getInt64FromSQLRow(sqlite3_stmt *sqlRow, int idx) {
  return sqlite3_column_int64(sqlRow, idx);
}
} // namespace comm
