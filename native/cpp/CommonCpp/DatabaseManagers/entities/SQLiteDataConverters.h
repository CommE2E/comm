#pragma once

#include <sqlite3.h>
#include <memory>
#include <optional>
#include <string>

namespace comm {
// getting data from SQL statement result row
std::string getStringFromSQLRow(sqlite3_stmt *sqlRow, int idx);
int getIntFromSQLRow(sqlite3_stmt *sqlRow, int idx);
std::optional<std::string>
getOptionalStringFromSQLRow(sqlite3_stmt *sqlRow, int idx);
std::optional<int> getOptionalIntFromSQLRow(sqlite3_stmt *sqlRow, int idx);
int64_t getInt64FromSQLRow(sqlite3_stmt *sqlRow, int idx);

// binding data to SQL statement
int bindStringToSQL(const std::string &data, sqlite3_stmt *sql, int idx);
int bindOptionalStringToSQL(
    const std::optional<std::string> &data,
    sqlite3_stmt *sql,
    int idx);
int bindIntToSQL(int data, sqlite3_stmt *sql, int idx);
int bindOptionalIntToSQL(
    const std::optional<int> &data,
    sqlite3_stmt *sql,
    int idx);
int bindInt64ToSQL(int64_t data, sqlite3_stmt *sql, int idx);

} // namespace comm
