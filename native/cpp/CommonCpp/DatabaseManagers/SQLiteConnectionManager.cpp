#include "SQLiteConnectionManager.h"

#include "Logger.h"
#include <sstream>
#include <stdexcept>
#include <string>
#include <system_error>

namespace comm {

SQLiteConnectionManager::SQLiteConnectionManager() : dbConnection(nullptr) {
}

sqlite3 *SQLiteConnectionManager::getConnection() {
  return dbConnection;
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

void SQLiteConnectionManager::initializeConnection(
    std::string sqliteFilePath,
    std::function<void(sqlite3 *)> on_db_open_callback) {
  if (dbConnection) {
    return;
  }

  int connectResult = sqlite3_open(sqliteFilePath.c_str(), &dbConnection);
  handleSQLiteError(connectResult, "Failed to open database connection.");
  on_db_open_callback(dbConnection);
}

void SQLiteConnectionManager::closeConnectionInternal() {
  if (!dbConnection) {
    return;
  }

  int closeResult = sqlite3_close(dbConnection);
  handleSQLiteError(closeResult, "Failed to close database connection.");
  dbConnection = nullptr;
}

void SQLiteConnectionManager::closeConnection() {
  closeConnectionInternal();
}

SQLiteConnectionManager::~SQLiteConnectionManager() {
  closeConnectionInternal();
}

void SQLiteConnectionManager::restoreFromBackupLog(
    const std::vector<std::uint8_t> &backupLog) {
  if (!dbConnection) {
    throw std::runtime_error(
        "Programmer error: attempt to restore from backup log but database "
        "connection is not initialized.");
  }

  static auto backupLogRestoreConflictHandler =
      [](void *, int conflictReason, sqlite3_changeset_iter *changesetIter) {
        const char *tableName;
        int columnsNumber;
        int operationType;

        int getOperationResult = sqlite3changeset_op(
            changesetIter, &tableName, &columnsNumber, &operationType, nullptr);
        handleSQLiteError(
            getOperationResult,
            "Failed to extract operation from log iterator.");

        std::stringstream conflictMessage;
        conflictMessage << "Conflict of type " << conflictReason
                        << " occurred for operation of type " << operationType
                        << " for table " << tableName
                        << " during backup log application";
        Logger::log(conflictMessage.str());

        if (operationType == SQLITE_INSERT &&
            conflictReason == SQLITE_CHANGESET_CONFLICT) {
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
