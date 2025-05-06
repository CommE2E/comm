#pragma once

#ifndef SQLITE_ENABLE_SESSION
#define SQLITE_ENABLE_SESSION
#endif

#include <sqlite3.h>
#include <functional>
#include <vector>

namespace comm {
class SQLiteConnectionManager {
protected:
  sqlite3 *dbConnection;
  static void handleSQLiteError(
      int errorCode,
      const std::string &errorMessagePrefix,
      int expectedResultCode = SQLITE_OK);
  void closeConnectionInternal();

public:
  SQLiteConnectionManager();
  sqlite3 *getConnection();
  virtual void initializeConnection(
      std::string sqliteFilePath,
      std::function<void(sqlite3 *)> on_db_open_callback);
  virtual void closeConnection() = 0;
  virtual ~SQLiteConnectionManager();
  virtual void restoreFromBackupLog(const std::vector<std::uint8_t> &backupLog);
};
} // namespace comm
