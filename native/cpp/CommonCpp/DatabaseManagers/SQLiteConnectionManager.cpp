#include "SQLiteConnectionManager.h"

#include <sstream>
#include <stdexcept>
#include <string>
#include <system_error>

namespace comm {

SQLiteConnectionManager::SQLiteConnectionManager() : dbConnection(nullptr) {
}

sqlite3 *SQLiteConnectionManager::getConnection() {
  return dbConnection;
}

void SQLiteConnectionManager::handleSQLiteError(
    int errorCode,
    const std::string &errorMessagePrefix,
    int expectedResultCode) {
  if (errorCode != expectedResultCode) {
    throw std::runtime_error(
        errorMessagePrefix + " Details: " + sqlite3_errstr(errorCode));
  }
}

void SQLiteConnectionManager::initializeConnection(
    std::string sqliteFilePath,
    std::function<void(sqlite3 *)> on_db_open_callback) {
  if (dbConnection) {
    return;
  }

  int connectResult = sqlite3_open(sqliteFilePath.c_str(), &dbConnection);
  handleSQLiteError(connectResult, "Failed to open database connection.");
  on_db_open_callback(dbConnection);
}

void SQLiteConnectionManager::closeConnectionInternal() {
  if (!dbConnection) {
    return;
  }

  int closeResult = sqlite3_close(dbConnection);
  handleSQLiteError(closeResult, "Failed to close database connection.");
  dbConnection = nullptr;
}

void SQLiteConnectionManager::closeConnection() {
  closeConnectionInternal();
}

SQLiteConnectionManager::~SQLiteConnectionManager() {
  closeConnectionInternal();
}
} // namespace comm
