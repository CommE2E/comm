#pragma once

#include "SQLiteConnectionManager.h"

namespace comm {
class NativeSQLiteConnectionManager : public SQLiteConnectionManager {
private:
  std::string backupDataKey;
  std::string backupLogDataKey;

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
  void onDatabaseOpen(sqlite3 *db, std::string sqliteEncryptionKey);

public:
  NativeSQLiteConnectionManager(
      std::string &databasePath,
      std::string &backupDataKey,
      std::string &backupLogDataKey);
  ~NativeSQLiteConnectionManager();

  void setNewKeys(
      const std::string &backupDataKey,
      const std::string &backupLogDataKey);

  std::string getBackupDataKey();
  std::string getBackupLogDataKey();

  sqlite3 *getEphemeralConnection() override;
  void initializeConnection() override;
  void closeConnection() override;

  void setLogsMonitoring(bool enabled);
  bool getLogsMonitoring();
  bool captureLogs(std::string backupID, std::string logID);
  void
  restoreFromBackupLog(const std::vector<std::uint8_t> &backupLog) override;

  void validateEncryption() override;
};
} // namespace comm
