#include "DatabaseManager.h"
#include "../Notifications/BackgroundDataStorage/NotificationsCryptoModule.h"
#include "../Tools/CommMMKV.h"
#include "../Tools/CommSecureStore.h"
#include "Logger.h"
#include "PlatformSpecificTools.h"
#include "SQLiteBackup.h"
#include "SQLiteQueryExecutor.h"
#include "SQLiteUtils.h"
#include "entities/EntityQueryHelpers.h"

#include "../Tools/ServicesUtils.h"
#include "lib.rs.h"

#include <fstream>
#include <sstream>

namespace comm {

const int DatabaseManager::backupDataKeySize = 64;
const int DatabaseManager::backupLogDataKeySize = 32;

std::shared_ptr<NativeSQLiteConnectionManager>
    DatabaseManager::connectionManager;

std::once_flag DatabaseManager::queryExecutorCreationIndicated;
std::once_flag DatabaseManager::sqliteQueryExecutorPropertiesInitialized;

typedef const std::string DatabaseManagerStatus;
DatabaseManagerStatus DB_MANAGER_WORKABLE = "WORKABLE";
DatabaseManagerStatus DB_MANAGER_FIRST_FAILURE = "FIRST_FAILURE";
DatabaseManagerStatus DB_MANAGER_SECOND_FAILURE = "SECOND_FAILURE";
DatabaseManagerStatus DB_OPERATIONS_FAILURE = "DB_OPERATIONS_FAILURE";

const std::string DATABASE_MANAGER_STATUS_KEY = "DATABASE_MANAGER_STATUS";

const DatabaseQueryExecutor &DatabaseManager::getQueryExecutor() {
  thread_local SQLiteQueryExecutor instance(DatabaseManager::connectionManager);

  // creating an instance means that migration code was executed
  // and finished without error and database is workable
  std::call_once(DatabaseManager::queryExecutorCreationIndicated, []() {
    DatabaseManager::indicateQueryExecutorCreation();
  });
  return instance;
}

void DatabaseManager::clearSensitiveData() {
  CommSecureStore::set(CommSecureStore::userID, "");
  CommSecureStore::set(CommSecureStore::deviceID, "");
  CommSecureStore::set(CommSecureStore::commServicesAccessToken, "");

  std::string backupDataKey = DatabaseManager::generateBackupDataKey();
  std::string backupLogDataKey = DatabaseManager::generateBackupLogDataKey();

  DatabaseManager::connectionManager->closeConnection();
  if (SQLiteUtils::fileExists(SQLiteQueryExecutor::sqliteFilePath) &&
      std::remove(SQLiteQueryExecutor::sqliteFilePath.c_str())) {
    std::ostringstream errorStream;
    errorStream << "Failed to delete database file. Details: "
                << strerror(errno);
    Logger::log(errorStream.str());
    throw std::system_error(errno, std::generic_category(), errorStream.str());
  }
  SQLiteQueryExecutor::backupDataKey = backupDataKey;
  SQLiteQueryExecutor::backupLogDataKey = backupLogDataKey;
  DatabaseManager::getQueryExecutor().migrate();

  PlatformSpecificTools::removeBackupDirectory();
  CommMMKV::clearSensitiveData();
  NotificationsCryptoModule::clearSensitiveData();
  DatabaseManager::setDatabaseStatusAsWorkable();
}

void DatabaseManager::initializeQueryExecutor(std::string &databasePath) {
  try {
    DatabaseManager::connectionManager =
        std::make_shared<NativeSQLiteConnectionManager>();
    DatabaseManager::initializeSQLiteQueryExecutorProperties(databasePath);
    DatabaseManager::getQueryExecutor();
    DatabaseManager::indicateQueryExecutorCreation();
    Logger::log("Database manager initialized");
  } catch (...) {
    folly::Optional<std::string> databaseManagerStatus =
        CommSecureStore::get(DATABASE_MANAGER_STATUS_KEY);
    if (!databaseManagerStatus.hasValue() ||
        databaseManagerStatus.value() == DB_MANAGER_WORKABLE) {
      CommSecureStore::set(
          DATABASE_MANAGER_STATUS_KEY, DB_MANAGER_FIRST_FAILURE);
      Logger::log("Database manager initialization issue, terminating app");
      throw;
    }
    if (databaseManagerStatus.value() == DB_MANAGER_FIRST_FAILURE) {
      CommSecureStore::set(
          DATABASE_MANAGER_STATUS_KEY, DB_MANAGER_SECOND_FAILURE);
      Logger::log(
          "Database manager initialization issue, app proceeding, but "
          "database needs to be deleted");
      return;
    }
  }
}

void DatabaseManager::setDatabaseStatusAsWorkable() {
  CommSecureStore::set(DATABASE_MANAGER_STATUS_KEY, DB_MANAGER_WORKABLE);
}

void DatabaseManager::indicateQueryExecutorCreation() {
  folly::Optional<std::string> databaseManagerStatus =
      CommSecureStore::get(DATABASE_MANAGER_STATUS_KEY);
  if (!databaseManagerStatus.hasValue() ||
      databaseManagerStatus.value() != DB_OPERATIONS_FAILURE) {
    // creating query executor means that schema was created without error,
    // but this doesn't imply that schema has a proper structure,
    // and operation will not crash, this case should not be overridden
    CommSecureStore::set(DATABASE_MANAGER_STATUS_KEY, DB_MANAGER_WORKABLE);
  }
}

std::string DatabaseManager::generateBackupDataKey() {
  std::string backupDataKey = comm::crypto::Tools::generateRandomHexString(
      DatabaseManager::backupDataKeySize);
  CommSecureStore::set(CommSecureStore::backupDataKey, backupDataKey);
  return backupDataKey;
}

std::string DatabaseManager::generateBackupLogDataKey() {
  std::string backupLogDataKey = comm::crypto::Tools::generateRandomHexString(
      DatabaseManager::backupLogDataKeySize);
  CommSecureStore::set(CommSecureStore::backupLogDataKey, backupLogDataKey);
  return backupLogDataKey;
}

void DatabaseManager::initializeSQLiteQueryExecutorProperties(
    std::string &databasePath) {
  std::call_once(
      DatabaseManager::sqliteQueryExecutorPropertiesInitialized,
      [&databasePath]() {
        folly::Optional<std::string> maybeBackupDataKey =
            CommSecureStore::get(CommSecureStore::backupDataKey);
        folly::Optional<std::string> maybeBackupLogDataKey =
            CommSecureStore::get(CommSecureStore::backupLogDataKey);

        std::string backupDataKey, backupLogDataKey;

        // In case of a non-existent database file, we always want to generate
        // fresh key.
        if (!SQLiteUtils::fileExists(databasePath) || !maybeBackupDataKey) {
          backupDataKey = DatabaseManager::generateBackupDataKey();
        } else {
          backupDataKey = maybeBackupDataKey.value();
        }

        // In case of a non-existent database file, we always want to generate
        // fresh key.
        if (!SQLiteUtils::fileExists(databasePath) || !maybeBackupLogDataKey) {
          backupLogDataKey = DatabaseManager::generateBackupLogDataKey();
        } else {
          backupLogDataKey = maybeBackupLogDataKey.value();
        }

        SQLiteQueryExecutor::sqliteFilePath = databasePath;
        SQLiteQueryExecutor::backupDataKey = backupDataKey;
        SQLiteQueryExecutor::backupLogDataKey = backupLogDataKey;
      });
}

bool DatabaseManager::checkIfDatabaseNeedsDeletion() {
  folly::Optional<std::string> databaseManagerStatus =
      CommSecureStore::get(DATABASE_MANAGER_STATUS_KEY);
  return databaseManagerStatus.hasValue() &&
      (databaseManagerStatus.value() == DB_MANAGER_SECOND_FAILURE ||
       databaseManagerStatus.value() == DB_OPERATIONS_FAILURE);
}

void DatabaseManager::reportDBOperationsFailure() {
  CommSecureStore::set(DATABASE_MANAGER_STATUS_KEY, DB_OPERATIONS_FAILURE);
}

void DatabaseManager::setUserDataKeys(
    const std::string &backupDataKey,
    const std::string &backupLogDataKey) {
  if (SQLiteQueryExecutor::backupDataKey.empty()) {
    throw std::runtime_error("backupDataKey is not set");
  }

  if (SQLiteQueryExecutor::backupLogDataKey.empty()) {
    throw std::runtime_error("backupLogDataKey is not set");
  }

  if (backupDataKey.size() != DatabaseManager::backupDataKeySize) {
    throw std::runtime_error("invalid backupDataKey size");
  }

  if (backupLogDataKey.size() != DatabaseManager::backupLogDataKeySize) {
    throw std::runtime_error("invalid backupLogDataKey size");
  }

  SQLiteUtils::rekeyDatabase(
      DatabaseManager::connectionManager->getConnection(), backupDataKey);

  CommSecureStore::set(CommSecureStore::backupDataKey, backupDataKey);
  SQLiteQueryExecutor::backupDataKey = backupDataKey;

  CommSecureStore::set(CommSecureStore::backupLogDataKey, backupLogDataKey);
  SQLiteQueryExecutor::backupLogDataKey = backupLogDataKey;
}

void DatabaseManager::captureBackupLogs() {
  if (!ServicesUtils::fullBackupSupport) {
    return;
  }
  std::string backupID =
      DatabaseManager::getQueryExecutor().getMetadata("backupID");
  if (!backupID.size()) {
    return;
  }

  std::string logID = DatabaseManager::getQueryExecutor().getMetadata("logID");
  if (!logID.size()) {
    logID = "1";
  }

  bool newLogCreated = DatabaseManager::connectionManager->captureLogs(
      backupID, logID, SQLiteQueryExecutor::backupLogDataKey);
  if (!newLogCreated) {
    return;
  }

  DatabaseManager::getQueryExecutor().setMetadata(
      "logID", std::to_string(std::stoi(logID) + 1));
}

void DatabaseManager::triggerBackupFileUpload() {
  if (!ServicesUtils::fullBackupSupport) {
    return;
  }
  ::triggerBackupFileUpload();
}

void DatabaseManager::createMainCompaction(std::string backupID) {
  std::string finalBackupPath =
      PlatformSpecificTools::getBackupFilePath(backupID, false);
  std::string finalAttachmentsPath =
      PlatformSpecificTools::getBackupFilePath(backupID, true);

  std::string tempBackupPath = finalBackupPath + "_tmp";
  std::string tempAttachmentsPath = finalAttachmentsPath + "_tmp";

  if (SQLiteUtils::fileExists(tempBackupPath)) {
    Logger::log(
        "Attempting to delete temporary backup file from previous backup "
        "attempt.");
    SQLiteUtils::attemptDeleteFile(
        tempBackupPath,
        "Failed to delete temporary backup file from previous backup "
        "attempt.");
  }

  if (SQLiteUtils::fileExists(tempAttachmentsPath)) {
    Logger::log(
        "Attempting to delete temporary attachments file from previous "
        "backup "
        "attempt.");
    SQLiteUtils::attemptDeleteFile(
        tempAttachmentsPath,
        "Failed to delete temporary attachments file from previous backup "
        "attempt.");
  }

  sqlite3 *backupDB;
  sqlite3_open(tempBackupPath.c_str(), &backupDB);
  SQLiteUtils::setEncryptionKey(backupDB, SQLiteQueryExecutor::backupDataKey);

  sqlite3_backup *backupObj = sqlite3_backup_init(
      backupDB,
      "main",
      DatabaseManager::connectionManager->getConnection(),
      "main");
  if (!backupObj) {
    std::stringstream error_message;
    error_message << "Failed to init backup for main compaction. Details: "
                  << sqlite3_errmsg(backupDB) << std::endl;
    sqlite3_close(backupDB);
    Logger::log(error_message.str());
    throw std::runtime_error(error_message.str());
  }

  int backupResult = sqlite3_backup_step(backupObj, -1);
  sqlite3_backup_finish(backupObj);
  if (backupResult == SQLITE_BUSY || backupResult == SQLITE_LOCKED) {
    sqlite3_close(backupDB);
    throw std::runtime_error(
        "Programmer error. Database in transaction during backup attempt.");
  } else if (backupResult != SQLITE_DONE) {
    sqlite3_close(backupDB);
    std::stringstream error_message;
    error_message << "Failed to create database backup. Details: "
                  << sqlite3_errstr(backupResult);
    Logger::log(error_message.str());
    throw std::runtime_error(error_message.str());
  }

  SQLiteBackup::cleanupDatabaseExceptAllowlist(backupDB);
  executeQuery(backupDB, "VACUUM;");
  sqlite3_close(backupDB);

  SQLiteUtils::attemptRenameFile(
      tempBackupPath,
      finalBackupPath,
      "Failed to rename complete temporary backup file to final backup "
      "file.");

  std::ofstream tempAttachmentsFile(tempAttachmentsPath);
  if (!tempAttachmentsFile.is_open()) {
    std::string errorMessage{
        "Unable to create attachments file for backup id: " + backupID};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  std::string getAllBlobServiceMediaSQL =
      "SELECT * FROM media WHERE uri LIKE 'comm-blob-service://%';";
  std::vector<Media> blobServiceMedia = getAllEntities<Media>(
      DatabaseManager::connectionManager->getConnection(),
      getAllBlobServiceMediaSQL);

  for (const auto &media : blobServiceMedia) {
    std::string blobServiceURI = media.uri;
    std::string blobHash =
        SQLiteUtils::blobHashFromBlobServiceURI(blobServiceURI);
    tempAttachmentsFile << blobHash << "\n";
  }
  tempAttachmentsFile.close();

  SQLiteUtils::attemptRenameFile(
      tempAttachmentsPath,
      finalAttachmentsPath,
      "Failed to rename complete temporary attachments file to final "
      "attachments file.");

  DatabaseManager::getQueryExecutor().setMetadata("backupID", backupID);
  DatabaseManager::getQueryExecutor().clearMetadata("logID");
  if (ServicesUtils::fullBackupSupport) {
    DatabaseManager::connectionManager->setLogsMonitoring(true);
  }
}

} // namespace comm
