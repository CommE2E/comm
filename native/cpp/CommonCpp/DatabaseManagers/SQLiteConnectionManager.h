#pragma once

#ifndef SQLITE_ENABLE_SESSION
#define SQLITE_ENABLE_SESSION
#endif

#include <sqlite3.h>
#include <functional>
#include <string>
#include <vector>

namespace comm {
class SQLiteConnectionManager {
protected:
  sqlite3 *dbConnection;
  std::string sqliteFilePath;

  static void handleSQLiteError(
      int errorCode,
      const std::string &errorMessagePrefix,
      int expectedResultCode = SQLITE_OK);
  void closeConnectionInternal();

  // Shared implementation of creating a connection used by derived classes.
  sqlite3 *createConnection() const;

public:
  SQLiteConnectionManager(std::string sqliteFilePath);
  virtual ~SQLiteConnectionManager();

  std::string getSQLiteFilePath();

  // Creates a SQLite connection that is returned, but it is the caller's
  // responsibility to manage and close it. It is important to use this method,
  // not the `sqlite3` API, because creating a connection might be different
  // depending on the platform. Custom behaviour is implemented in derived
  // classes.
  virtual sqlite3 *getEphemeralConnection() const = 0;
  // Creates a SQLite connection that is cached and stored as an attribute. It
  // can be accessed using `getConnection` and closed using `closeConnection`
  virtual void initializeConnection() = 0;
  sqlite3 *getConnection() const;
  virtual void closeConnection() = 0;

  virtual void validateEncryption() = 0;

  virtual void restoreFromBackupLog(const std::vector<std::uint8_t> &backupLog);
};
} // namespace comm
