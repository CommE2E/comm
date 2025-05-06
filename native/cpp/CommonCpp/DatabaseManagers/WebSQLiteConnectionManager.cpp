#include "WebSQLiteConnectionManager.h"

namespace comm {

WebSQLiteConnectionManager::WebSQLiteConnectionManager() {
}

WebSQLiteConnectionManager::~WebSQLiteConnectionManager() {
}

void WebSQLiteConnectionManager::closeConnection() {
  SQLiteConnectionManager::closeConnectionInternal();
}

} // namespace comm
