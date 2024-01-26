#pragma once

#ifndef SQLITE_ENABLE_SESSION
#define SQLITE_ENABLE_SESSION
#endif

#include <sqlite3.h>
#include <vector>

namespace comm {
class SQLiteConnectionManager {
private:
  sqlite3 *dbConnection;
  sqlite3_session *backupLogsSession;
  int logsCount;

  void attachSession();
  void persistLog(
      std::string backupID,
      std::string logID,
      std::uint8_t *changesetPtr,
      int changesetSize);

public:
  SQLiteConnectionManager();
  sqlite3 *getConnection();
  void initializeConnection(
      std::string sqliteFilePath,
      std::function<void(sqlite3 *)> on_db_open_callback);
  void closeConnection();
  ~SQLiteConnectionManager();
  bool shouldIncrementLogID(std::string backupID, std::string logID);
  bool captureLogs(std::string backupID, std::string logID);
};
} // namespace comm
