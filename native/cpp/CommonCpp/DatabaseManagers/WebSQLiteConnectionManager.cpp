#include "WebSQLiteConnectionManager.h"

#include "SQLiteUtils.h"

namespace comm {

WebSQLiteConnectionManager::WebSQLiteConnectionManager(
    std::string sqliteFilePath)
    : SQLiteConnectionManager(sqliteFilePath) {
}

WebSQLiteConnectionManager::~WebSQLiteConnectionManager() {
}

void WebSQLiteConnectionManager::closeConnection() {
  SQLiteConnectionManager::closeConnectionInternal();
}

sqlite3 *WebSQLiteConnectionManager::getEphemeralConnection() {
  return this->createConnection();
  // We don't want to run `PRAGMA key = ...;`
  // on main web database. The context is here:
  // https://linear.app/comm/issue/ENG-6398/issues-with-sqlcipher-on-web
}

void WebSQLiteConnectionManager::initializeConnection() {
  if (this->dbConnection) {
    return;
  }
  this->dbConnection = this->createConnection();
  // We don't want to run `PRAGMA key = ...;`
  // on main web database. The context is here:
  // https://linear.app/comm/issue/ENG-6398/issues-with-sqlcipher-on-web
}

void WebSQLiteConnectionManager::validateEncryption() {
  // We don't want to run `PRAGMA key = ...;`
  // on main web database. The context is here:
  // https://linear.app/comm/issue/ENG-6398/issues-with-sqlcipher-on-web
}

void WebSQLiteConnectionManager::setSQLiteFilePath(std::string sqliteFilePath) {
  bool isConnectionInitialized = this->dbConnection;
  if (isConnectionInitialized) {
    this->closeConnection();
  }

  this->sqliteFilePath = sqliteFilePath;
  if (isConnectionInitialized) {
    this->initializeConnection();
  }
}

} // namespace comm
