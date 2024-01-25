#pragma once

#include "SQLiteConnectionManager.h"

namespace comm {
class NativeConnectionManager : public SQLiteConnectionManager {
private:
  sqlite3_session *backupLogsSession;

  void attachSession();
  void detachSession();
  void persistLog(
      std::string backupID,
      std::string logID,
      std::uint8_t *changesetPtr,
      int changesetSize);

public:
  NativeConnectionManager();
  void initializeConnection(
      std::string sqliteFilePath,
      std::function<void(sqlite3 *)> on_db_open_callback) override;
  void closeConnection() override;
  ~NativeConnectionManager();
  void captureLogs(std::string backupID, std::string logID);
};
} // namespace comm
