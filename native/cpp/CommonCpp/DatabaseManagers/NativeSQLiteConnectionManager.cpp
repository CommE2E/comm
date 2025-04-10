#include "NativeSQLiteConnectionManager.h"
#include "AESCrypto.h"
#include "Logger.h"
#include "PlatformSpecificTools.h"

#include <fstream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <system_error>

namespace comm {

const std::string BLOB_SERVICE_PREFIX = "comm-blob-service://";

const int IV_LENGTH = 12;
const int TAG_LENGTH = 16;

void NativeSQLiteConnectionManager::attachSession() {
  int sessionCreationResult =
      sqlite3session_create(dbConnection, "main", &backupLogsSession);
  handleSQLiteError(sessionCreationResult, "Failed to create sqlite3 session.");

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
    int patchsetSize,
    std::string encryptionKey) {
  std::string finalFilePath =
      PlatformSpecificTools::getBackupLogFilePath(backupID, logID, false);
  std::string tempFilePath = finalFilePath + "_tmp";

  std::ofstream tempFile(
      tempFilePath, std::ofstream::out | std::ofstream::trunc);

  if (!tempFile.is_open()) {
    std::string errorMessage{
        "Failed to open temporary file when persisting log"};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  std::vector<std::uint8_t> logBytes(patchsetPtr, patchsetPtr + patchsetSize);

  std::vector<std::uint8_t> encryptedLog;
  encryptedLog.resize(logBytes.size() + IV_LENGTH + TAG_LENGTH);

  std::vector<std::uint8_t> encryptionKeyBytes(
      encryptionKey.begin(), encryptionKey.end());

  AESCrypto<std::vector<std::uint8_t> &>::encrypt(
      encryptionKeyBytes, logBytes, encryptedLog);

  tempFile.write(
      reinterpret_cast<const char *>(encryptedLog.data()), encryptedLog.size());
  tempFile.close();

  if (std::rename(tempFilePath.c_str(), finalFilePath.c_str())) {
    std::string errorMessage{
        "Failed to rename complete log file from temporary path to target when "
        "persisting log"};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  std::vector<std::string> attachments =
      getAttachmentsFromLog(patchsetPtr, patchsetSize);
  if (attachments.empty()) {
    return;
  }

  std::string finalAttachmentsPath =
      PlatformSpecificTools::getBackupLogFilePath(backupID, logID, true);
  std::string tempAttachmentsPath = finalAttachmentsPath + "_tmp";

  std::ofstream tempAttachmentsFile(
      tempAttachmentsPath, std::ofstream::out | std::ofstream::trunc);

  if (!tempAttachmentsFile.is_open()) {
    std::string errorMessage{
        "Failed to open temporary log attachments file when persisting log"};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  for (const auto &attachment : attachments) {
    tempAttachmentsFile << attachment << std::endl;
  }
  tempAttachmentsFile.close();

  if (std::rename(tempAttachmentsPath.c_str(), finalAttachmentsPath.c_str())) {
    std::string errorMessage{
        "Failed to rename complete log attachments file from temporary path to "
        "target path when persisting log"};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }
}

std::vector<std::string> NativeSQLiteConnectionManager::getAttachmentsFromLog(
    std::uint8_t *patchsetPtr,
    int patchsetSize) {
  std::vector<std::string> attachments;
  sqlite3_changeset_iter *patchsetIter;
  int startIterResult =
      sqlite3changeset_start(&patchsetIter, patchsetSize, patchsetPtr);
  handleSQLiteError(startIterResult, "Failed to initialize log iterator.");

  int nextResult;
  for (nextResult = sqlite3changeset_next(patchsetIter);
       nextResult == SQLITE_ROW;
       nextResult = sqlite3changeset_next(patchsetIter)) {
    const char *tableName;
    int columnsNumber;
    int operationType;

    int getOperationResult = sqlite3changeset_op(
        patchsetIter, &tableName, &columnsNumber, &operationType, nullptr);
    handleSQLiteError(
        getOperationResult, "Failed to extract operation from log iterator.");

    if (std::string(tableName) != "media") {
      continue;
    }

    if (operationType != SQLITE_UPDATE && operationType != SQLITE_INSERT) {
      continue;
    }

    sqlite3_value *uriFromMediaRow;
    // In "media" table "uri" column has index 3 (starting from 0)
    int getURIResult = sqlite3changeset_new(patchsetIter, 3, &uriFromMediaRow);
    handleSQLiteError(
        getURIResult,
        "Failed to extract uri value of media row from log iterator.");

    if (!uriFromMediaRow) {
      continue;
    }

    std::string uri = std::string(
        reinterpret_cast<const char *>(sqlite3_value_text(uriFromMediaRow)));
    if (uri.compare(0, BLOB_SERVICE_PREFIX.size(), BLOB_SERVICE_PREFIX)) {
      continue;
    }
    attachments.push_back(uri.substr(BLOB_SERVICE_PREFIX.size()));
  }

  handleSQLiteError(
      nextResult, "Error while iterating over a log.", SQLITE_DONE);

  int finalizeIterResult = sqlite3changeset_finalize(patchsetIter);
  handleSQLiteError(finalizeIterResult, "Failed to finalize log iterator.");

  return attachments;
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

bool NativeSQLiteConnectionManager::getLogsMonitoring() {
  if (!backupLogsSession) {
    return false;
  }
  return sqlite3session_enable(backupLogsSession, -1);
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
    std::string logID,
    std::string encryptionKey) {
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

  persistLog(backupID, logID, patchsetPtr, patchsetSize, encryptionKey);
  sqlite3_free(patchsetPtr);

  // The session is not "zeroed" after capturing log.
  // See: https://www.sqlite.org/sessionintro.html
  // So we need to delete and recreate session each
  // time we capture log.
  detachSession();
  attachSession();
  return true;
}

void NativeSQLiteConnectionManager::restoreFromBackupLog(
    const std::vector<std::uint8_t> &backupLog) {
  bool initialEnabledValue = getLogsMonitoring();
  setLogsMonitoring(false);
  SQLiteConnectionManager::restoreFromBackupLog(backupLog);
  setLogsMonitoring(initialEnabledValue);
}
} // namespace comm
