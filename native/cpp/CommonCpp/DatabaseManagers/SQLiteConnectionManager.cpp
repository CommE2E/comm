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

void SQLiteConnectionManager::initializeConnection(
    std::string sqliteFilePath,
    std::function<void(sqlite3 *)> on_db_open_callback) {
  if (dbConnection) {
    return;
  }

  int connectResult = sqlite3_open(sqliteFilePath.c_str(), &dbConnection);

  if (connectResult != SQLITE_OK) {
    throw std::runtime_error(
        "Failed to open database connection. Details: " +
        std::string(sqlite3_errstr(connectResult)));
  }

  on_db_open_callback(dbConnection);
}

void SQLiteConnectionManager::closeConnectionInternal() {
  if (!dbConnection) {
    return;
  }

  int closeResult = sqlite3_close(dbConnection);
  if (closeResult != SQLITE_OK) {
    throw std::runtime_error(
        "Failed to close database connection. Details: " +
        std::string(sqlite3_errstr(closeResult)));
  }

  dbConnection = nullptr;
}

void SQLiteConnectionManager::closeConnection() {
  closeConnectionInternal();
}

SQLiteConnectionManager::~SQLiteConnectionManager() {
  closeConnectionInternal();
}
} // namespace comm
