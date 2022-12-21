#include "DatabaseManager.h"
#include "../Tools/CommSecureStore.h"
#include "../Tools/TerminateApp.h"
#include "Logger.h"
#include "SQLiteQueryExecutor.h"

namespace comm {

typedef const std::string DatabaseManagerStatus;
DatabaseManagerStatus DB_MANAGER_WORKABLE = "WORKABLE";
DatabaseManagerStatus DB_MANAGER_FIRST_FAILURE = "FIRST_FAILURE";
DatabaseManagerStatus DB_MANAGER_SECOND_FAILURE = "SECOND_FAILURE";

const std::string DATABASE_MANAGER_STATUS_KEY = "DATABASE_MANAGER_STATUS";

const DatabaseQueryExecutor &DatabaseManager::getQueryExecutor() {
  //  TODO: conditionally create desired type of db manager
  //  maybe basing on some preprocessor flag
  thread_local SQLiteQueryExecutor instance;
  return instance;
}

void DatabaseManager::initializeQueryExecutor() {
  comm::CommSecureStore commSecureStore{};
  try {
    DatabaseManager::getQueryExecutor();
    commSecureStore.set(DATABASE_MANAGER_STATUS_KEY, DB_MANAGER_WORKABLE);
    Logger::log("Database manager initialized");
  } catch (...) {
    folly::Optional<std::string> databaseManagerStatus =
        commSecureStore.get(DATABASE_MANAGER_STATUS_KEY);
    if (!databaseManagerStatus.hasValue()) {
      commSecureStore.set(
          DATABASE_MANAGER_STATUS_KEY, DB_MANAGER_FIRST_FAILURE);
      Logger::log("Database manager initialization issue, terminating app");
      TerminateApp::terminate();
      return;
    }
    std::string databaseManagerStatusValue = databaseManagerStatus.value();
    Logger::log(databaseManagerStatusValue);
    if (databaseManagerStatusValue == DB_MANAGER_WORKABLE) {
      commSecureStore.set(
          DATABASE_MANAGER_STATUS_KEY, DB_MANAGER_FIRST_FAILURE);
      Logger::log("Database manager initialization issue, terminating app");
      TerminateApp::terminate();
      return;
    }
    if (databaseManagerStatusValue == DB_MANAGER_FIRST_FAILURE) {
      commSecureStore.set(
          DATABASE_MANAGER_STATUS_KEY, DB_MANAGER_SECOND_FAILURE);
      Logger::log(
          "Database manager initialization issue, app proceeding, but "
          "database needs to be deleted");
      return;
    }
  }
}

} // namespace comm
