#include "SQLiteConnectionManager.h"
#include "PlatformSpecificTools.h"

#include <fstream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <system_error>

namespace comm {

const int MAX_LOGS_BUFFER_SIZE = 5;

void SQLiteConnectionManager::attachSession() {
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

void SQLiteConnectionManager::persistLog(
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

SQLiteConnectionManager::SQLiteConnectionManager()
    : dbConnection(nullptr), backupLogsSession(nullptr), logsCount(0) {
}

sqlite3 *SQLiteConnectionManager::getConnection() {
  return dbConnection;
}

void SQLiteConnectionManager::initializeConnection(
    std::string sqliteFilePath,
    std::function<void(sqlite3 *)> on_db_open_callback) {
  if (dbConnection) {
    return;
  }

  int connectResult = sqlite3_open(sqliteFilePath.c_str(), &dbConnection);

  if (connectResult != SQLITE_OK) {
    throw std::runtime_error(
        "Failed to open database connection. Details: " +
        std::string(sqlite3_errstr(connectResult)));
  }

  on_db_open_callback(dbConnection);
  attachSession();
}

void SQLiteConnectionManager::closeConnection() {
  if (!dbConnection && !backupLogsSession) {
    return;
  }

  if (!dbConnection) {
    throw std::runtime_error(
        "Programmer error: database connection destroyed before backup logs "
        "session.");
  }

  if (backupLogsSession) {
    sqlite3session_delete(backupLogsSession);
    backupLogsSession = nullptr;
  }

  int closeResult = sqlite3_close(dbConnection);
  if (closeResult != SQLITE_OK) {
    throw std::runtime_error(
        "Failed to close database connection. Details: " +
        std::string(sqlite3_errstr(closeResult)));
  }

  dbConnection = nullptr;
}

SQLiteConnectionManager::~SQLiteConnectionManager() {
  closeConnection();
}

bool SQLiteConnectionManager::shouldIncrementLogID(
    std::string backupID,
    std::string logID) {
  std::string logFilePath =
      PlatformSpecificTools::getBackupLogFilePath(backupID, logID, false);
  std::ifstream logFile(logFilePath.c_str());

  if (logFile.good() && !logsCount) {
    return true;
  }

  if (logFile.good() && logsCount >= MAX_LOGS_BUFFER_SIZE) {
    return true;
  }

  return false;
}

bool SQLiteConnectionManager::captureLogs(
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

  if (changesetSize == 0 && !changesetPtr) {
    return false;
  }

  persistLog(backupID, logID, changesetPtr, changesetSize);
  sqlite3_free(changesetPtr);

  logsCount++;
  if (logsCount >= MAX_LOGS_BUFFER_SIZE) {
    logsCount = 0;
    sqlite3session_delete(backupLogsSession);
    attachSession();
    return true;
  }

  return false;
}
} // namespace comm
