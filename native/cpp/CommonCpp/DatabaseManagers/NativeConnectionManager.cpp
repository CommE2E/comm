#include "NativeConnectionManager.h"
#include "PlatformSpecificTools.h"

#include <fstream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <system_error>

namespace comm {

void NativeConnectionManager::attachSession() {
  int sessionCreationResult =
      sqlite3session_create(dbConnection, "main", &backupLogsSession);

  if (sessionCreationResult != SQLITE_OK) {
    throw std::runtime_error(
        "Failed to create sqlite3 session. Details: " +
        std::string(sqlite3_errstr(sessionCreationResult)));
  }

  int sessionAttachResult = sqlite3session_attach(backupLogsSession, nullptr);

  if (sessionAttachResult != SQLITE_OK) {
    throw std::runtime_error(
        "Failed to attach sqlite3 session. Details: " +
        std::string(sqlite3_errstr(sessionAttachResult)));
  }
}

void NativeConnectionManager::detachSession() {
  if (!backupLogsSession) {
    return;
  }
  sqlite3session_delete(backupLogsSession);
  backupLogsSession = nullptr;
}

void NativeConnectionManager::persistLog(
    std::string backupID,
    std::string logID,
    std::uint8_t *changesetPtr,
    int changesetSize) {
  std::string finalFilePath =
      PlatformSpecificTools::getBackupLogFilePath(backupID, logID, false);
  std::string tempFilePath = finalFilePath + "_tmp";

  std::ofstream tempFile(
      tempFilePath, std::ofstream::out | std::ofstream::trunc);

  if (!tempFile.is_open()) {
    throw std::runtime_error("Failed to open temporary log file.");
  }
  tempFile << std::string(changesetPtr, changesetPtr + changesetSize);
  tempFile.close();
  if (std::rename(tempFilePath.c_str(), finalFilePath.c_str())) {
    throw std::runtime_error(
        "Failed to rename complete log file from temporary path to target "
        "path.");
  }
}

NativeConnectionManager::NativeConnectionManager()
    : backupLogsSession(nullptr) {
}

void NativeConnectionManager::initializeConnection(
    std::string sqliteFilePath,
    std::function<void(sqlite3 *)> on_db_open_callback) {
  SQLiteConnectionManager::initializeConnection(
      sqliteFilePath, on_db_open_callback);
  attachSession();
}

void NativeConnectionManager::closeConnection() {
  detachSession();
  SQLiteConnectionManager::closeConnectionInternal();
}

NativeConnectionManager::~NativeConnectionManager() {
  detachSession();
}

void NativeConnectionManager::captureLogs(
    std::string backupID,
    std::string logID) {
  int changesetSize;
  std::uint8_t *changesetPtr;
  int getChangesetResult = sqlite3session_patchset(
      backupLogsSession, &changesetSize, (void **)&changesetPtr);

  if (getChangesetResult != SQLITE_OK) {
    throw std::runtime_error(
        "Failed to get changeset from session. Details: " +
        std::string(sqlite3_errstr(getChangesetResult)));
  }

  if (changesetSize == 0 || !changesetPtr) {
    return;
  }

  persistLog(backupID, logID, changesetPtr, changesetSize);
  sqlite3_free(changesetPtr);
  detachSession();
  attachSession();
}
} // namespace comm
