#include "NativeSQLiteConnectionManager.h"

#include "AESCrypto.h"
#include "Logger.h"
#include "PlatformSpecificTools.h"
#include "SQLiteBackup.h"
#include "SQLiteUtils.h"

#include <fstream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <system_error>

namespace comm {

const int IV_LENGTH = 12;
const int TAG_LENGTH = 16;

void NativeSQLiteConnectionManager::attachSession() {
  int sessionCreationResult =
      sqlite3session_create(dbConnection, "main", &backupLogsSession);
  handleSQLiteError(sessionCreationResult, "Failed to create sqlite3 session.");

  std::vector<std::string> tablesToMonitor(
      SQLiteBackup::tablesAllowlist.begin(),
      SQLiteBackup::tablesAllowlist.end());

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

  Logger::log(
      "BACKUP_LOG: Starting file write - backupID=" + backupID +
      ", logID=" + logID + ", size=" + std::to_string(patchsetSize) +
      ", path=" + finalFilePath);

  std::ofstream tempFile(
      tempFilePath, std::ofstream::out | std::ofstream::trunc);

  if (!tempFile.is_open()) {
    std::string errorMessage{
        "BACKUP_LOG: Failed to open temporary file when persisting log - "
        "backupID=" +
        backupID + ", logID=" + logID + ", path=" + tempFilePath};
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
        "BACKUP_LOG: Failed to rename complete log file from temporary path to "
        "target when persisting log - backupID=" +
        backupID + ", logID=" + logID + ", tempPath=" + tempFilePath +
        ", finalPath=" + finalFilePath};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  Logger::log(
      "BACKUP_LOG: File written successfully - backupID=" + backupID +
      ", logID=" + logID + ", path=" + finalFilePath);

  std::vector<std::string> attachments =
      getAttachmentsFromLog(patchsetPtr, patchsetSize);
  if (attachments.empty()) {
    Logger::log(
        "BACKUP_LOG: No attachments found - backupID=" + backupID +
        ", logID=" + logID);
    return;
  }

  std::string finalAttachmentsPath =
      PlatformSpecificTools::getBackupLogFilePath(backupID, logID, true);
  std::string tempAttachmentsPath = finalAttachmentsPath + "_tmp";

  Logger::log(
      "BACKUP_LOG: Starting attachment file write - backupID=" + backupID +
      ", logID=" + logID + ", attachments=" +
      std::to_string(attachments.size()) + ", path=" + finalAttachmentsPath);

  std::ofstream tempAttachmentsFile(
      tempAttachmentsPath, std::ofstream::out | std::ofstream::trunc);

  if (!tempAttachmentsFile.is_open()) {
    std::string errorMessage{
        "BACKUP_LOG: Failed to open temporary log attachments file when "
        "persisting log - backupID=" +
        backupID + ", logID=" + logID + ", path=" + tempAttachmentsPath};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  for (const auto &attachment : attachments) {
    tempAttachmentsFile << attachment << std::endl;
  }
  tempAttachmentsFile.close();

  if (std::rename(tempAttachmentsPath.c_str(), finalAttachmentsPath.c_str())) {
    std::string errorMessage{
        "BACKUP_LOG: Failed to rename complete log attachments file from "
        "temporary path to target path when persisting log - backupID=" +
        backupID + ", logID=" + logID + ", tempPath=" + tempAttachmentsPath +
        ", finalPath=" + finalAttachmentsPath};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  Logger::log(
      "BACKUP_LOG: Attachment file written successfully - backupID=" +
      backupID + ", logID=" + logID + ", attachments=" +
      std::to_string(attachments.size()) + ", path=" + finalAttachmentsPath);
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

    if (std::string(tableName) != "holders") {
      continue;
    }

    if (operationType != SQLITE_UPDATE && operationType != SQLITE_INSERT) {
      continue;
    }

    sqlite3_value *hashResult;
    int getHashResult = sqlite3changeset_new(patchsetIter, 0, &hashResult);
    handleSQLiteError(
        getHashResult,
        "Failed to extract hash value of holder row from log iterator");

    if (!hashResult) {
      continue;
    }

    std::string hash = std::string(
        reinterpret_cast<const char *>(sqlite3_value_text(hashResult)));
    attachments.push_back(hash);
  }

  handleSQLiteError(
      nextResult, "Error while iterating over a log.", SQLITE_DONE);

  int finalizeIterResult = sqlite3changeset_finalize(patchsetIter);
  handleSQLiteError(finalizeIterResult, "Failed to finalize log iterator.");

  return attachments;
}

NativeSQLiteConnectionManager::NativeSQLiteConnectionManager(
    std::string databasePath,
    std::string backupDataKey,
    std::string backupLogDataKey)
    : SQLiteConnectionManager(databasePath),
      backupLogsSession(nullptr),
      backupDataKey(backupDataKey),
      backupLogDataKey(backupLogDataKey),
      backupLogsEnabledOnInit(false) {
}

void NativeSQLiteConnectionManager::setLogsMonitoringEnabled(bool enabled) {
  if (!backupLogsSession) {
    return;
  }
  sqlite3session_enable(backupLogsSession, enabled);
  this->backupLogsEnabledOnInit = enabled;
}

bool NativeSQLiteConnectionManager::getLogsMonitoringEnabled() {
  if (!backupLogsSession) {
    return false;
  }
  return sqlite3session_enable(backupLogsSession, -1);
}

void NativeSQLiteConnectionManager::onDatabaseOpen(sqlite3 *db) const {
  SQLiteUtils::setEncryptionKey(db, this->backupDataKey);
}

sqlite3 *NativeSQLiteConnectionManager::getEphemeralConnection() const {
  sqlite3 *db = this->createConnection();
  onDatabaseOpen(db);
  return db;
}

void NativeSQLiteConnectionManager::initializeConnection() {
  if (this->dbConnection) {
    return;
  }
  this->dbConnection = this->createConnection();
  onDatabaseOpen(getConnection());
  attachSession();
  this->setLogsMonitoringEnabled(this->backupLogsEnabledOnInit);
}

void NativeSQLiteConnectionManager::closeConnection() {
  detachSession();
  SQLiteConnectionManager::closeConnectionInternal();
}

NativeSQLiteConnectionManager::~NativeSQLiteConnectionManager() {
  detachSession();
}

bool NativeSQLiteConnectionManager::captureNextLog(
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

  persistLog(
      backupID, logID, patchsetPtr, patchsetSize, this->backupLogDataKey);
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
  bool initialEnabledValue = this->getLogsMonitoringEnabled();
  this->setLogsMonitoringEnabled(false);
  SQLiteConnectionManager::restoreFromBackupLog(backupLog);
  this->setLogsMonitoringEnabled(initialEnabledValue);
}

void NativeSQLiteConnectionManager::setNewKeys(
    const std::string &backupDataKey,
    const std::string &backupLogDataKey) {
  bool isConnectionInitialized = this->dbConnection;
  if (isConnectionInitialized) {
    this->closeConnection();
  }

  this->backupDataKey = backupDataKey;
  this->backupLogDataKey = backupLogDataKey;
  if (isConnectionInitialized) {
    this->initializeConnection();
  }
}

std::string NativeSQLiteConnectionManager::getBackupDataKey() {
  return this->backupDataKey;
}

std::string NativeSQLiteConnectionManager::getBackupLogDataKey() {
  return this->backupLogDataKey;
}

void NativeSQLiteConnectionManager::validateEncryption() {
  SQLiteUtils::validateEncryption(this->sqliteFilePath, this->backupDataKey);
}

} // namespace comm
