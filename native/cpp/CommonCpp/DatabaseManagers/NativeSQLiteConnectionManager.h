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
  void onDatabaseOpen(sqlite3 *db, std::string sqliteEncryptionKey);

public:
  NativeSQLiteConnectionManager();
  ~NativeSQLiteConnectionManager();

  sqlite3 *getEphemeralConnection(
      std::string sqliteFilePath,
      std::string sqliteEncryptionKey) override;
  void initializeConnection(
      std::string sqliteFilePath,
      std::string sqliteEncryptionKey) override;
  void closeConnection() override;
  virtual void validateEncryption(
      const std::string &sqliteFilePath,
      const std::string &encryptionKey) override;

  void setLogsMonitoring(bool enabled);
  bool getLogsMonitoring();
  bool captureLogs(
      std::string backupID,
      std::string logID,
      std::string encryptionKey);
  void
  restoreFromBackupLog(const std::vector<std::uint8_t> &backupLog) override;
};
} // namespace comm
