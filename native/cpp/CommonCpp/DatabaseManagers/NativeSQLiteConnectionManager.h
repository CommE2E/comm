#pragma once

#include "SQLiteConnectionManager.h"

namespace comm {
class NativeSQLiteConnectionManager : public SQLiteConnectionManager {
private:
  sqlite3_session *backupLogsSession;

  void attachSession();
  void detachSession();
  void persistLog(
      std::string backupID,
      std::string logID,
      std::uint8_t *patchsetPtr,
      int patchsetSize,
      std::string encryptionKey);
  std::vector<std::string>
  getAttachmentsFromLog(std::uint8_t *patchsetPtr, int patchsetSize);

public:
  NativeSQLiteConnectionManager();
  void setLogsMonitoring(bool enabled);
  bool getLogsMonitoring();
  void initializeConnection(
      std::string sqliteFilePath,
      std::function<void(sqlite3 *)> on_db_open_callback) override;
  void closeConnection() override;
  ~NativeSQLiteConnectionManager();
  bool captureLogs(
      std::string backupID,
      std::string logID,
      std::string encryptionKey);
  void
  restoreFromBackupLog(const std::vector<std::uint8_t> &backupLog) override;
};
} // namespace comm
