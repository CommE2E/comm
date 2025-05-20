#include "WebSQLiteConnectionManager.h"

#include "SQLiteUtils.h"

namespace comm {

WebSQLiteConnectionManager::WebSQLiteConnectionManager() {
}

WebSQLiteConnectionManager::~WebSQLiteConnectionManager() {
}

void WebSQLiteConnectionManager::closeConnection() {
  SQLiteConnectionManager::closeConnectionInternal();
}

sqlite3 *WebSQLiteConnectionManager::getEphemeralConnection(
    std::string sqliteFilePath,
    std::string sqliteEncryptionKey) {
  return this->createConnection(sqliteFilePath);
  // We don't want to run `PRAGMA key = ...;`
  // on main web database. The context is here:
  // https://linear.app/comm/issue/ENG-6398/issues-with-sqlcipher-on-web
}

void WebSQLiteConnectionManager::initializeConnection(
    std::string sqliteFilePath,
    std::string sqliteEncryptionKey) {
  if (this->dbConnection) {
    return;
  }
  this->dbConnection = this->createConnection(sqliteFilePath);
  // We don't want to run `PRAGMA key = ...;`
  // on main web database. The context is here:
  // https://linear.app/comm/issue/ENG-6398/issues-with-sqlcipher-on-web
}

void WebSQLiteConnectionManager::validateEncryption(
    const std::string &sqliteFilePath,
    const std::string &encryptionKey) {
  // We don't want to run `PRAGMA key = ...;`
  // on main web database. The context is here:
  // https://linear.app/comm/issue/ENG-6398/issues-with-sqlcipher-on-web
  // For more context, see NativeSQLiteConnectionManager::validateEncryption
  // implementation.
}

} // namespace comm
