#pragma once

#include <sqlite3.h>
#include <memory>
#include <string>

namespace comm {
std::string getStringFromSQLRow(sqlite3_stmt *sqlRow, int idx);
int getIntFromSQLRow(sqlite3_stmt *sqlRow, int idx);
std::unique_ptr<std::string>
getStringPtrFromSQLRow(sqlite3_stmt *sqlRow, int idx);
std::unique_ptr<int> getIntPtrFromSQLRow(sqlite3_stmt *sqlRow, int idx);
int64_t getInt64FromSQLRow(sqlite3_stmt *sqlRow, int idx);
} // namespace comm