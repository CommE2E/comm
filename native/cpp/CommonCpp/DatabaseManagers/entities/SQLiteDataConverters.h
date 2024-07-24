#pragma once

#include <sqlite3.h>
#include <memory>
#include <string>

namespace comm {
// getting data from SQL statement result row
std::string getStringFromSQLRow(sqlite3_stmt *sqlRow, int idx);
int getIntFromSQLRow(sqlite3_stmt *sqlRow, int idx);
std::unique_ptr<std::string>
getStringPtrFromSQLRow(sqlite3_stmt *sqlRow, int idx);
std::unique_ptr<int> getIntPtrFromSQLRow(sqlite3_stmt *sqlRow, int idx);
int64_t getInt64FromSQLRow(sqlite3_stmt *sqlRow, int idx);

// binding data to SQL statement
int bindStringToSQL(const std::string &data, sqlite3_stmt *sql, int idx);
int bindStringPtrToSQL(
    const std::unique_ptr<std::string> &data,
    sqlite3_stmt *sql,
    int idx);
int bindIntToSQL(int data, sqlite3_stmt *sql, int idx);
long long int bindLongLongToSQL(long long data, sqlite3_stmt *sql, int idx);
int bindIntPtrToSQL(
    const std::unique_ptr<int> &data,
    sqlite3_stmt *sql,
    int idx);
int bindInt64ToSQL(int64_t data, sqlite3_stmt *sql, int idx);

} // namespace comm
