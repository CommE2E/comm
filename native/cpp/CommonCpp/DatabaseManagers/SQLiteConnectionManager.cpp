#include "SQLiteConnectionManager.h"
#include "PlatformSpecificTools.h"

#include <fstream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <system_error>

namespace comm {

const int MAX_LOGS_BUFFER_SIZE = 5;
const std::string BLOB_SERVICE_PREFIX = "comm-blob-service://";

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

  std::vector<std::string> attachments =
      getAttachmentsFromLog(changesetPtr, changesetSize);
  if (!attachments.size()) {
    return;
  }

  std::string finalAttachmentsPath =
      PlatformSpecificTools::getBackupLogFilePath(backupID, logID, true);
  std::string tempAttachmentsPath = finalAttachmentsPath + "_tmp";

  std::ofstream tempAttachmentsFile(
      tempAttachmentsPath, std::ofstream::out | std::ofstream::trunc);

  if (!tempAttachmentsFile.is_open()) {
    throw std::runtime_error("Failed to open temporary log attachments file.");
  }

  for (const auto &attachment : attachments) {
    tempAttachmentsFile << attachment << std::endl;
  }
  tempAttachmentsFile.close();

  if (std::rename(tempAttachmentsPath.c_str(), finalAttachmentsPath.c_str())) {
    throw std::runtime_error(
        "Failed to rename complete log attachments file from temporary path to "
        "target "
        "path.");
  }
}

std::vector<std::string> SQLiteConnectionManager::getAttachmentsFromLog(
    std::uint8_t *changesetPtr,
    int changesetSize) {
  std::vector<std::string> attachments;
  sqlite3_changeset_iter *changesetIter;
  int startIterResult =
      sqlite3changeset_start(&changesetIter, changesetSize, changesetPtr);

  if (startIterResult != SQLITE_OK) {
    throw std::runtime_error(
        "Failed to initialize log iterator. Details: " +
        std::string(sqlite3_errstr(startIterResult)));
  }

  int nextResult;
  for (nextResult = sqlite3changeset_next(changesetIter);
       nextResult == SQLITE_ROW;
       nextResult = sqlite3changeset_next(changesetIter)) {
    const char *tableName;
    int columnsNumber;
    int operationType;

    int getOperationResult = sqlite3changeset_op(
        changesetIter, &tableName, &columnsNumber, &operationType, 0);

    if (getOperationResult != SQLITE_OK) {
      throw std::runtime_error(
          "Failed to extract operation from log iterator. Details: " +
          std::string(sqlite3_errstr(getOperationResult)));
    }

    if (std::string(tableName) != "media") {
      continue;
    }

    if (operationType != SQLITE_UPDATE && operationType != SQLITE_INSERT) {
      continue;
    }

    sqlite3_value *uriFromMediaRow;
    // In "media" table "uri" column has index 3 (starting from 0)
    int getURIResult = sqlite3changeset_new(changesetIter, 3, &uriFromMediaRow);
    if (getURIResult != SQLITE_OK) {
      throw std::runtime_error(
          "Failed to extract uri value of media row from "
          "log iterator. Details: " +
          std::string(sqlite3_errstr(getURIResult)));
    }

    if (!uriFromMediaRow) {
      continue;
    }

    std::string uri = std::string(
        reinterpret_cast<const char *>(sqlite3_value_text(uriFromMediaRow)));
    if (uri.substr(0, BLOB_SERVICE_PREFIX.size()) != BLOB_SERVICE_PREFIX) {
      continue;
    }
    attachments.push_back(uri.substr(BLOB_SERVICE_PREFIX.size()));
  }

  if (nextResult != SQLITE_DONE) {
    throw std::runtime_error(
        "Error while iterating over a log. Details: " +
        std::string(sqlite3_errstr(nextResult)));
  }

  int finalizeIterResult = sqlite3changeset_finalize(changesetIter);
  if (finalizeIterResult != SQLITE_OK) {
    throw std::runtime_error(
        "Failed to finalize log iterator. Details: " +
        std::string(sqlite3_errstr(finalizeIterResult)));
  }

  return attachments;
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
