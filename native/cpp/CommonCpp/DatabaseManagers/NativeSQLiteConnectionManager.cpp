#include "NativeSQLiteConnectionManager.h"
#include "PlatformSpecificTools.h"

#include <fstream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <system_error>

namespace comm {

void NativeSQLiteConnectionManager::attachSession() {
  int sessionCreationResult =
      sqlite3session_create(dbConnection, "main", &backupLogsSession);
  handleSQLiteError(sessionCreationResult, "Failed to create sqlite3 session.");

  static const std::vector<std::string> tablesToMonitor = {
      "drafts",
      "messages",
      "media",
      "threads",
      "message_store_threads",
      "reports",
      "keyservers",
      "users"};

  for (const auto &table : tablesToMonitor) {
    int sessionAttachResult =
        sqlite3session_attach(backupLogsSession, table.c_str());
    handleSQLiteError(
        sessionAttachResult,
        "Failed to attach sqlite3 session to " + table + " table.");
  }
}

void NativeSQLiteConnectionManager::detachSession() {
  if (!backupLogsSession) {
    return;
  }
  sqlite3session_delete(backupLogsSession);
  backupLogsSession = nullptr;
}

void NativeSQLiteConnectionManager::persistLog(
    std::string backupID,
    std::string logID,
    std::uint8_t *patchsetPtr,
    int patchsetSize) {
  std::string finalFilePath =
      PlatformSpecificTools::getBackupLogFilePath(backupID, logID, false);
  std::string tempFilePath = finalFilePath + "_tmp";

  std::ofstream tempFile(
      tempFilePath, std::ofstream::out | std::ofstream::trunc);

  if (!tempFile.is_open()) {
    throw std::runtime_error("Failed to open temporary log file.");
  }
  tempFile.write(reinterpret_cast<const char *>(patchsetPtr), patchsetSize);
  tempFile.close();
  if (std::rename(tempFilePath.c_str(), finalFilePath.c_str())) {
    throw std::runtime_error(
        "Failed to rename complete log file from temporary path to target "
        "path.");
  }
}

NativeSQLiteConnectionManager::NativeSQLiteConnectionManager()
    : backupLogsSession(nullptr) {
}

void NativeSQLiteConnectionManager::setLogsMonitoring(bool enabled) {
  if (!backupLogsSession) {
    return;
  }
  sqlite3session_enable(backupLogsSession, enabled);
}

void NativeSQLiteConnectionManager::initializeConnection(
    std::string sqliteFilePath,
    std::function<void(sqlite3 *)> on_db_open_callback) {
  SQLiteConnectionManager::initializeConnection(
      sqliteFilePath, on_db_open_callback);
  attachSession();
  setLogsMonitoring(false);
}

void NativeSQLiteConnectionManager::closeConnection() {
  detachSession();
  SQLiteConnectionManager::closeConnectionInternal();
}

NativeSQLiteConnectionManager::~NativeSQLiteConnectionManager() {
  detachSession();
}

bool NativeSQLiteConnectionManager::captureLogs(
    std::string backupID,
    std::string logID) {
  int patchsetSize;
  std::uint8_t *patchsetPtr;
  int getPatchsetResult = sqlite3session_patchset(
      backupLogsSession, &patchsetSize, (void **)&patchsetPtr);
  handleSQLiteError(getPatchsetResult, "Failed to get patchset from session.");

  if (!patchsetPtr) {
    return false;
  }

  if (patchsetSize == 0) {
    sqlite3_free(patchsetPtr);
    return false;
  }

  persistLog(backupID, logID, patchsetPtr, patchsetSize);
  sqlite3_free(patchsetPtr);

  // The session is not "zeroed" after capturing log.
  // See: https://www.sqlite.org/sessionintro.html
  // So we need to delete and recreate session each
  // time we capture log.
  detachSession();
  attachSession();
  return true;
}
} // namespace comm
