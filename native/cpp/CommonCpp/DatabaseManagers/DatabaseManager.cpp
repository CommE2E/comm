#include "DatabaseManager.h"
#include "../Notifications/BackgroundDataStorage/NotificationsCryptoModule.h"
#include "../Tools/CommMMKV.h"
#include "../Tools/CommSecureStore.h"
#include "Logger.h"
#include "PlatformSpecificTools.h"
#include "SQLiteQueryExecutor.h"
#include "SQLiteUtils.h"

#include "../Tools/ServicesUtils.h"
#include "lib.rs.h"

#include <sstream>

namespace comm {

const int DatabaseManager::backupDataKeySize = 64;
const int DatabaseManager::backupLogDataKeySize = 32;

std::once_flag DatabaseManager::queryExecutorCreationIndicated;
std::once_flag DatabaseManager::sqliteQueryExecutorPropertiesInitialized;

typedef const std::string DatabaseManagerStatus;
DatabaseManagerStatus DB_MANAGER_WORKABLE = "WORKABLE";
DatabaseManagerStatus DB_MANAGER_FIRST_FAILURE = "FIRST_FAILURE";
DatabaseManagerStatus DB_MANAGER_SECOND_FAILURE = "SECOND_FAILURE";
DatabaseManagerStatus DB_OPERATIONS_FAILURE = "DB_OPERATIONS_FAILURE";

const std::string DATABASE_MANAGER_STATUS_KEY = "DATABASE_MANAGER_STATUS";

const DatabaseQueryExecutor &DatabaseManager::getQueryExecutor() {
  thread_local SQLiteQueryExecutor instance;

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

  SQLiteQueryExecutor::connectionManager.closeConnection();
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
  SQLiteQueryExecutor::migrate();

  PlatformSpecificTools::removeBackupDirectory();
  CommMMKV::clearSensitiveData();
  NotificationsCryptoModule::clearSensitiveData();
  DatabaseManager::setDatabaseStatusAsWorkable();
}

void DatabaseManager::initializeQueryExecutor(std::string &databasePath) {
  try {
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

        SQLiteQueryExecutor::initialize(
            databasePath, backupDataKey, backupLogDataKey);
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
      SQLiteQueryExecutor::getConnection(), backupDataKey);

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

  bool newLogCreated = SQLiteQueryExecutor::connectionManager.captureLogs(
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

} // namespace comm
