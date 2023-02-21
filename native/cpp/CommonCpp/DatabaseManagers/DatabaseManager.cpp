#include "DatabaseManager.h"
#include "../Notifications/BackgroundDataStorage/NotificationsCryptoModule.h"
#include "../Tools/CommSecureStore.h"
#include "Logger.h"
#include "SQLiteQueryExecutor.h"

namespace comm {

std::once_flag DatabaseManager::initialized;

typedef const std::string DatabaseManagerStatus;
DatabaseManagerStatus DB_MANAGER_WORKABLE = "WORKABLE";
DatabaseManagerStatus DB_MANAGER_FIRST_FAILURE = "FIRST_FAILURE";
DatabaseManagerStatus DB_MANAGER_SECOND_FAILURE = "SECOND_FAILURE";

const std::string DATABASE_MANAGER_STATUS_KEY = "DATABASE_MANAGER_STATUS";

const DatabaseQueryExecutor &DatabaseManager::getQueryExecutor() {
  //  TODO: conditionally create desired type of db manager
  //  maybe basing on some preprocessor flag
  thread_local SQLiteQueryExecutor instance;

  // creating an instance means that migration code was executed
  // and finished without error and database is workable
  std::call_once(DatabaseManager::initialized, []() {
    DatabaseManager::setDatabaseStatusAsWorkable();
  });
  return instance;
}

void DatabaseManager::clearSensitiveData() {
  SQLiteQueryExecutor::clearSensitiveData();
  NotificationsCryptoModule::clearSensitiveData();
  DatabaseManager::setDatabaseStatusAsWorkable();
}

void DatabaseManager::initializeQueryExecutor(std::string &databasePath) {
  comm::CommSecureStore commSecureStore{};
  try {
    SQLiteQueryExecutor::initialize(databasePath);
    DatabaseManager::getQueryExecutor();
    commSecureStore.set(DATABASE_MANAGER_STATUS_KEY, DB_MANAGER_WORKABLE);
    Logger::log("Database manager initialized");
  } catch (...) {
    folly::Optional<std::string> databaseManagerStatus =
        commSecureStore.get(DATABASE_MANAGER_STATUS_KEY);
    if (!databaseManagerStatus.hasValue() ||
        databaseManagerStatus.value() == DB_MANAGER_WORKABLE) {
      commSecureStore.set(
          DATABASE_MANAGER_STATUS_KEY, DB_MANAGER_FIRST_FAILURE);
      Logger::log("Database manager initialization issue, terminating app");
      throw;
    }
    if (databaseManagerStatus.value() == DB_MANAGER_FIRST_FAILURE) {
      commSecureStore.set(
          DATABASE_MANAGER_STATUS_KEY, DB_MANAGER_SECOND_FAILURE);
      Logger::log(
          "Database manager initialization issue, app proceeding, but "
          "database needs to be deleted");
      return;
    }
  }
}

void DatabaseManager::setDatabaseStatusAsWorkable() {
  comm::CommSecureStore commSecureStore{};
  commSecureStore.set(DATABASE_MANAGER_STATUS_KEY, DB_MANAGER_WORKABLE);
}

bool DatabaseManager::checkIfDatabaseNeedsDeletion() {
  comm::CommSecureStore commSecureStore{};
  folly::Optional<std::string> databaseManagerStatus =
      commSecureStore.get(DATABASE_MANAGER_STATUS_KEY);
  return databaseManagerStatus.hasValue() &&
      databaseManagerStatus.value() == DB_MANAGER_SECOND_FAILURE;
}

} // namespace comm
