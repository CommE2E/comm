#pragma once

#include "SQLiteConnectionManager.h"

namespace comm {
class NativeSQLiteConnectionManager : public SQLiteConnectionManager {
private:
  sqlite3_session *backupLogsSession;
  std::string backupDataKey;
  std::string backupLogDataKey;
  // cache the value between connection resets
  bool backupLogsEnabledOnInit;

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
  void onDatabaseOpen(sqlite3 *db) const;

public:
  NativeSQLiteConnectionManager(
      std::string databasePath,
      std::string backupDataKey,
      std::string backupLogDataKey);
  ~NativeSQLiteConnectionManager();

  sqlite3 *getEphemeralConnection() const override;
  void initializeConnection() override;
  void closeConnection() override;
  void validateEncryption() override;

  std::string getBackupDataKey();
  std::string getBackupLogDataKey();
  void setNewKeys(
      const std::string &backupDataKey,
      const std::string &backupLogDataKey);
  void setLogsMonitoringEnabled(bool enabled);
  bool getLogsMonitoringEnabled();
  bool captureNextLog(std::string backupID, std::string logID);
  void
  restoreFromBackupLog(const std::vector<std::uint8_t> &backupLog) override;
};
} // namespace comm
