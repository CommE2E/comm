#include "SQLiteConnectionManager.h"

#include "Logger.h"
#include <sstream>
#include <stdexcept>
#include <string>
#include <system_error>

namespace comm {

SQLiteConnectionManager::SQLiteConnectionManager(std::string sqliteFilePath)
    : dbConnection(nullptr), sqliteFilePath(sqliteFilePath) {
}

sqlite3 *SQLiteConnectionManager::getConnection() const {
  return dbConnection;
}

std::string SQLiteConnectionManager::getSQLiteFilePath() {
  return this->sqliteFilePath;
}

void SQLiteConnectionManager::handleSQLiteError(
    int errorCode,
    const std::string &errorMessagePrefix,
    int expectedResultCode) {
  if (errorCode != expectedResultCode) {
    auto message =
        errorMessagePrefix + " Details: " + sqlite3_errstr(errorCode);
    Logger::log("SQLiteError: " + message);
    throw std::runtime_error(message);
  }
}

sqlite3 *SQLiteConnectionManager::createConnection() const {
  sqlite3 *dbConnection;
  int connectResult = sqlite3_open(this->sqliteFilePath.c_str(), &dbConnection);
  handleSQLiteError(connectResult, "Failed to open database connection");
  return dbConnection;
}

void SQLiteConnectionManager::closeConnectionInternal() {
  if (!dbConnection) {
    return;
  }

  int closeResult = sqlite3_close(dbConnection);
  handleSQLiteError(closeResult, "Failed to close database connection.");
  dbConnection = nullptr;
}

SQLiteConnectionManager::~SQLiteConnectionManager() {
  closeConnectionInternal();
}

void SQLiteConnectionManager::restoreFromBackupLog(
    const std::vector<std::uint8_t> &backupLog) {
  this->initializeConnection();
  if (!dbConnection) {
    std::string errorMessage{
        "Programmer error: attempt to restore from backup log, but database "
        "connection is not initialized"};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  static auto backupLogRestoreConflictHandler =
      [](void *, int conflictReason, sqlite3_changeset_iter *changesetIter) {
        const char *tableName;
        int columnsNumber;
        int operationType;

        int getOperationResult = sqlite3changeset_op(
            changesetIter, &tableName, &columnsNumber, &operationType, nullptr);

        if (getOperationResult != SQLITE_OK) {
          Logger::log(
              "ERROR: Failed to extract operation from log iterator. Error: " +
              std::string(sqlite3_errstr(getOperationResult)));
          handleSQLiteError(
              getOperationResult,
              "Failed to extract operation from log iterator.");
        }

        std::string conflictReasonStr;
        switch (conflictReason) {
          case SQLITE_CHANGESET_DATA:
            conflictReasonStr = "DATA";
            break;
          case SQLITE_CHANGESET_NOTFOUND:
            conflictReasonStr = "NOTFOUND";
            break;
          case SQLITE_CHANGESET_CONFLICT:
            conflictReasonStr = "CONFLICT";
            break;
          case SQLITE_CHANGESET_CONSTRAINT:
            conflictReasonStr = "CONSTRAINT";
            break;
          case SQLITE_CHANGESET_FOREIGN_KEY:
            conflictReasonStr = "FOREIGN_KEY";
            break;
          default:
            conflictReasonStr =
                "UNKNOWN(" + std::to_string(conflictReason) + ")";
            break;
        }

        std::string operationTypeStr;
        switch (operationType) {
          case SQLITE_INSERT:
            operationTypeStr = "INSERT";
            break;
          case SQLITE_DELETE:
            operationTypeStr = "DELETE";
            break;
          case SQLITE_UPDATE:
            operationTypeStr = "UPDATE";
            break;
          default:
            operationTypeStr = "UNKNOWN(" + std::to_string(operationType) + ")";
            break;
        }

        std::stringstream conflictMessage;
        conflictMessage << "CONFLICT: " << conflictReasonStr << " conflict"
                        << " for " << operationTypeStr << " operation"
                        << " on table '" << (tableName ? tableName : "NULL")
                        << "' (columns: " << columnsNumber << ")";
        Logger::log(conflictMessage.str());

        if ((operationType == SQLITE_INSERT &&
             conflictReason == SQLITE_CHANGESET_CONFLICT) ||
            (operationType == SQLITE_DELETE &&
             conflictReason == SQLITE_CHANGESET_DATA)) {
          return SQLITE_CHANGESET_REPLACE;
        }

        return SQLITE_CHANGESET_OMIT;
      };

  int applyChangesetResult = sqlite3changeset_apply(
      dbConnection,
      backupLog.size(),
      (void *)backupLog.data(),
      nullptr,
      backupLogRestoreConflictHandler,
      nullptr);
  handleSQLiteError(applyChangesetResult, "Failed to apply backup log.");
}
} // namespace comm
