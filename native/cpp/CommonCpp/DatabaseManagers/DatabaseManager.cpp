#include "DatabaseManager.h"
#include "../Notifications/BackgroundDataStorage/NotificationsCryptoModule.h"
#include "../Tools/CommMMKV.h"
#include "../Tools/CommSecureStore.h"
#include "Logger.h"
#include "NativeSQLiteConnectionManager.h"
#include "PlatformSpecificTools.h"
#include "SQLiteBackup.h"
#include "SQLiteQueryExecutor.h"
#include "SQLiteUtils.h"
#include "entities/EntityQueryHelpers.h"

#include "../Tools/ServicesUtils.h"
#include "lib.rs.h"

#include <folly/dynamic.h>
#include <folly/json.h>
#include <fstream>
#include <sstream>
#include <stdexcept>

namespace comm {

std::shared_ptr<NativeSQLiteConnectionManager>
    DatabaseManager::mainConnectionManager;

std::shared_ptr<NativeSQLiteConnectionManager>
    DatabaseManager::restoredConnectionManager;

std::once_flag DatabaseManager::queryExecutorCreationIndicated;
std::once_flag DatabaseManager::sqliteQueryExecutorPropertiesInitialized;

typedef const std::string DatabaseManagerStatus;
DatabaseManagerStatus DB_MANAGER_WORKABLE = "WORKABLE";
DatabaseManagerStatus DB_MANAGER_FIRST_FAILURE = "FIRST_FAILURE";
DatabaseManagerStatus DB_MANAGER_SECOND_FAILURE = "SECOND_FAILURE";
DatabaseManagerStatus DB_OPERATIONS_FAILURE = "DB_OPERATIONS_FAILURE";

const std::string DATABASE_MANAGER_STATUS_KEY = "DATABASE_MANAGER_STATUS";

const DatabaseQueryExecutor &DatabaseManager::getQueryExecutor() {
  return DatabaseManager::getQueryExecutor(DatabaseIdentifier::MAIN);
}

const DatabaseQueryExecutor &
DatabaseManager::getQueryExecutor(DatabaseIdentifier id) {
  if (id == DatabaseIdentifier::RESTORED) {
    if (!DatabaseManager::restoredConnectionManager) {
      DatabaseManager::initializeRestoredConnectionManager();
    }

    thread_local SQLiteQueryExecutor restoredQueryExecutor(
        DatabaseManager::restoredConnectionManager, true);
    restoredQueryExecutor.setConnectionManager(
        DatabaseManager::restoredConnectionManager);
    return restoredQueryExecutor;
  }

  thread_local SQLiteQueryExecutor mainQueryExecutor(
      DatabaseManager::mainConnectionManager);

  // Creating an instance means the migration code was executed and finished
  // without error, and the database is workable. We also want to start
  // monitoring logs when this device should handle backup.
  std::call_once(DatabaseManager::queryExecutorCreationIndicated, []() {
    DatabaseManager::indicateQueryExecutorCreation();
    std::string currentBackupID = mainQueryExecutor.getMetadata("backupID");
    const auto userID = CommSecureStore::get(CommSecureStore::userID);
    if (!ServicesUtils::fullBackupSupport() || !currentBackupID.size() ||
        !userID.hasValue()) {
      return;
    }

    // We should enable logs only for primary device
    const auto currentUserDBInfo =
        mainQueryExecutor.getSingleAuxUserInfo(userID.value());
    if (!currentUserDBInfo.has_value()) {
      return;
    }
    bool shouldEnableLogs =
        DatabaseManager::isPrimaryDevice(currentUserDBInfo.value());
    DatabaseManager::mainConnectionManager->setLogsMonitoringEnabled(
        shouldEnableLogs);
  });
  return mainQueryExecutor;
}

void DatabaseManager::clearMainDatabaseSensitiveData() {
  std::string backupDataKey = DatabaseManager::generateBackupDataKey();
  std::string backupLogDataKey = DatabaseManager::generateBackupLogDataKey();

  DatabaseManager::mainConnectionManager->setLogsMonitoringEnabled(false);
  DatabaseManager::mainConnectionManager->closeConnection();
  std::string sqliteFilePath =
      DatabaseManager::mainConnectionManager->getSQLiteFilePath();

  if (SQLiteUtils::fileExists(sqliteFilePath)) {
    SQLiteUtils::attemptDeleteFile(
        sqliteFilePath, "Failed to delete main database file");
  }

  DatabaseManager::mainConnectionManager->setNewKeys(
      backupDataKey, backupLogDataKey);

  DatabaseManager::getQueryExecutor().migrate();
  DatabaseManager::mainConnectionManager->initializeConnection();
}

void DatabaseManager::clearRestoredDatabaseSensitiveData() {
  CommSecureStore::set(CommSecureStore::restoredBackupPath, "");
  CommSecureStore::set(CommSecureStore::restoredBackupDataKey, "");

  if (!DatabaseManager::restoredConnectionManager) {
    return;
  }
  DatabaseManager::restoredConnectionManager->closeConnection();
  std::string sqliteFilePath =
      DatabaseManager::restoredConnectionManager->getSQLiteFilePath();

  if (SQLiteUtils::fileExists(sqliteFilePath)) {
    SQLiteUtils::attemptDeleteFile(
        sqliteFilePath, "Failed to delete restored database file");
  }

  DatabaseManager::restoredConnectionManager.reset();
}

void DatabaseManager::clearSensitiveData() {
  CommSecureStore::set(CommSecureStore::userID, "");
  CommSecureStore::set(CommSecureStore::deviceID, "");
  CommSecureStore::set(CommSecureStore::commServicesAccessToken, "");

  DatabaseManager::clearMainDatabaseSensitiveData();
  DatabaseManager::clearRestoredDatabaseSensitiveData();

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

void DatabaseManager::initializeRestoredConnectionManager() {
  if (DatabaseManager::restoredConnectionManager) {
    return;
  }
  folly::Optional<std::string> mainCompactionPath =
      CommSecureStore::get(CommSecureStore::restoredBackupPath);
  folly::Optional<std::string> mainCompactionEncryptionKey =
      CommSecureStore::get(CommSecureStore::restoredBackupDataKey);

  if (!mainCompactionPath.has_value() ||
      !mainCompactionEncryptionKey.has_value()) {
    throw std::runtime_error("mainCompaction path / encryption key is not set");
  }

  SQLiteBackup::validateMainCompaction(
      mainCompactionPath.value(), mainCompactionEncryptionKey.value());

  DatabaseManager::restoredConnectionManager =
      std::make_shared<NativeSQLiteConnectionManager>(
          mainCompactionPath.value(), mainCompactionEncryptionKey.value(), "");
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
  std::string backupDataKey = SQLiteBackup::generateRandomBackupDataKey();
  CommSecureStore::set(CommSecureStore::backupDataKey, backupDataKey);
  return backupDataKey;
}

std::string DatabaseManager::generateBackupLogDataKey() {
  std::string backupLogDataKey = SQLiteBackup::generateRandomBackupLogDataKey();
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

        DatabaseManager::mainConnectionManager =
            std::make_shared<NativeSQLiteConnectionManager>(
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
  const auto &connectionManager = DatabaseManager::mainConnectionManager;

  if (connectionManager->getBackupDataKey().empty()) {
    throw std::runtime_error("backupDataKey is not set");
  }

  if (connectionManager->getBackupLogDataKey().empty()) {
    throw std::runtime_error("backupLogDataKey is not set");
  }

  if (backupDataKey.size() != SQLiteBackup::backupDataKeySize) {
    throw std::runtime_error("invalid backupDataKey size");
  }

  if (backupLogDataKey.size() != SQLiteBackup::backupLogDataKeySize) {
    throw std::runtime_error("invalid backupLogDataKey size");
  }

  connectionManager->initializeConnection();
  SQLiteUtils::rekeyDatabase(connectionManager->getConnection(), backupDataKey);

  CommSecureStore::set(CommSecureStore::backupDataKey, backupDataKey);
  CommSecureStore::set(CommSecureStore::backupLogDataKey, backupLogDataKey);
  connectionManager->setNewKeys(backupDataKey, backupLogDataKey);
}

void DatabaseManager::captureBackupLogForLastOperation() {
  if (!ServicesUtils::fullBackupSupport()) {
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

  bool newLogCreated =
      DatabaseManager::mainConnectionManager->captureNextLog(backupID, logID);
  if (!newLogCreated) {
    return;
  }

  DatabaseManager::getQueryExecutor().setMetadata(
      "logID", std::to_string(std::stoi(logID) + 1));
}

void DatabaseManager::triggerBackupFileUpload() {
  if (!ServicesUtils::fullBackupSupport()) {
    return;
  }
  ::triggerBackupFileUpload();
}

void DatabaseManager::createMainCompaction(
    std::string backupID,
    std::string mainCompactionEncryptionKey,
    std::string newLogEncryptionKey) {
  std::string finalBackupPath =
      PlatformSpecificTools::getBackupFilePath(backupID, false, false);
  std::string finalBackupVersionInfoPath =
      PlatformSpecificTools::getBackupFilePath(backupID, false, true);
  std::string finalAttachmentsPath =
      PlatformSpecificTools::getBackupFilePath(backupID, true, false);

  std::string tempBackupPath = finalBackupPath + "_tmp";
  std::string tempAttachmentsPath = finalAttachmentsPath + "_tmp";
  std::string tempVersionPath = finalBackupVersionInfoPath + "_tmp";

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
        "backup attempt.");
    SQLiteUtils::attemptDeleteFile(
        tempAttachmentsPath,
        "Failed to delete temporary attachments file from previous backup "
        "attempt.");
  }

  if (SQLiteUtils::fileExists(tempVersionPath)) {
    Logger::log(
        "Attempting to delete temporary version file from previous backup "
        "attempt.");
    SQLiteUtils::attemptDeleteFile(
        tempVersionPath,
        "Failed to delete temporary version file from previous backup "
        "attempt.");
  }

  // handle main compaction
  sqlite3 *backupDB;
  sqlite3_open(tempBackupPath.c_str(), &backupDB);
  SQLiteUtils::setEncryptionKey(backupDB, mainCompactionEncryptionKey);

  DatabaseManager::mainConnectionManager->initializeConnection();
  sqlite3_backup *backupObj = sqlite3_backup_init(
      backupDB,
      "main",
      DatabaseManager::mainConnectionManager->getConnection(),
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

  // handle attachments
  std::ofstream tempAttachmentsFile(tempAttachmentsPath);
  if (!tempAttachmentsFile.is_open()) {
    std::string errorMessage{
        "Unable to create attachments file for backup id: " + backupID};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  auto holders = DatabaseManager::getQueryExecutor().getHolders();
  for (const auto &holder : holders) {
    tempAttachmentsFile << holder.hash << "\n";
  }
  tempAttachmentsFile.close();

  SQLiteUtils::attemptRenameFile(
      tempAttachmentsPath,
      finalAttachmentsPath,
      "Failed to rename complete temporary attachments file to final "
      "attachments file.");

  // handle db version info
  std::ofstream tempVersionFile(tempVersionPath);
  if (!tempVersionFile.is_open()) {
    std::string errorMessage{
        "Unable to create version file for backup id: " + backupID};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }
  int dbVersion = SQLiteUtils::getDatabaseVersion(
      DatabaseManager::mainConnectionManager->getConnection());
  tempVersionFile << dbVersion;
  tempVersionFile.close();

  SQLiteUtils::attemptRenameFile(
      tempVersionPath,
      finalBackupVersionInfoPath,
      "Failed to rename complete temporary version file to final version "
      "file.");

  // update logs to use new backup
  DatabaseManager::mainConnectionManager->setLogsMonitoringEnabled(false);
  DatabaseManager::getQueryExecutor().setMetadata("backupID", backupID);
  DatabaseManager::getQueryExecutor().clearMetadata("logID");
  if (ServicesUtils::fullBackupSupport()) {
    DatabaseManager::setUserDataKeys(
        mainCompactionEncryptionKey, newLogEncryptionKey);
    DatabaseManager::mainConnectionManager->setLogsMonitoringEnabled(true);
  }
}

void DatabaseManager::restoreFromMainCompaction(
    std::string mainCompactionPath,
    std::string mainCompactionEncryptionKey,
    std::string maxVersion) {
  SQLiteBackup::validateMainCompaction(
      mainCompactionPath, mainCompactionEncryptionKey);
  CommSecureStore::set(CommSecureStore::restoredBackupPath, mainCompactionPath);
  CommSecureStore::set(
      CommSecureStore::restoredBackupDataKey, mainCompactionEncryptionKey);
  // At this point, logs are already applied to the database, and we don't have
  // access to it, so we use just an empty string.
  DatabaseManager::restoredConnectionManager =
      std::make_shared<NativeSQLiteConnectionManager>(
          mainCompactionPath, mainCompactionEncryptionKey, "");
}

void DatabaseManager::copyContentFromBackupDatabase() {
  if (!DatabaseManager::restoredConnectionManager) {
    DatabaseManager::initializeRestoredConnectionManager();
  }

  DatabaseManager::getQueryExecutor().copyContentFromDatabase(
      DatabaseManager::restoredConnectionManager->getSQLiteFilePath(),
      DatabaseManager::restoredConnectionManager->getBackupDataKey());
  // Copying is the final step of the restore, we don't need it anymore, so we
  // should clean all the data.
  DatabaseManager::clearRestoredDatabaseSensitiveData();
}

bool DatabaseManager::isPrimaryDevice() {
  const auto userID = CommSecureStore::get(CommSecureStore::userID);
  if (!userID.hasValue()) {
    return false;
  }

  const auto currentUserDBInfo =
      DatabaseManager::getQueryExecutor(DatabaseIdentifier::MAIN)
          .getSingleAuxUserInfo(userID.value());
  if (!currentUserDBInfo.has_value()) {
    return false;
  }

  return DatabaseManager::isPrimaryDevice(currentUserDBInfo.value());
}

bool DatabaseManager::isPrimaryDevice(const AuxUserInfo &currentUserDBInfo) {
  const auto currentDeviceID = CommSecureStore::get(CommSecureStore::deviceID);
  if (!currentDeviceID.hasValue()) {
    return false;
  }

  folly::dynamic auxUserInfoJSON;
  try {
    auxUserInfoJSON = folly::parseJson(currentUserDBInfo.aux_user_info);
  } catch (const folly::json::parse_error &e) {
    throw std::runtime_error(
        "Current user AuxUserInfo JSON deserialization failed with "
        "reason: " +
        std::string(e.what()));
  }
  try {
    folly::dynamic deviceListObject = auxUserInfoJSON["deviceList"];
    if (!deviceListObject.isObject()) {
      throw std::runtime_error(
          "Current user AuxUserInfo.deviceList is not set");
    }
    folly::dynamic deviceList = deviceListObject["devices"];
    if (!deviceList.isArray() || !deviceList.size()) {
      throw std::runtime_error(
          "Device list object is missing the 'devices' property "
          "or the device list is empty.");
    }

    const std::string primaryDeviceID = deviceList.begin()->asString();
    return currentDeviceID.value() == primaryDeviceID;
  } catch (std::exception &e) {
    Logger::log(
        "Failed to determine if current device is primary: " +
        std::string(e.what()));
    return false;
  }
}

} // namespace comm
