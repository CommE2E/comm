#pragma once

#include "DatabaseQueryExecutor.h"
#include "SQLiteQueryExecutor.h"

#include <mutex>

namespace comm {

class DatabaseManager {
  // Indicate that at least one instance of SQLiteQueryExecutor was created,
  // which is identical to finishing the migration process and having a fully
  // operational database that can be used by application logic.
  static std::once_flag queryExecutorCreationIndicated;
  static void indicateQueryExecutorCreation();

  // Indicate that all properties needed to create an instance of
  // SQLiteQueryExecutor were initialized in a thread-safe way (keys were read
  // from SecureStore or generated).
  static std::once_flag sqliteQueryExecutorPropertiesInitialized;
  static void
  initializeSQLiteQueryExecutorProperties(std::string &databasePath);

  // Generate and persist a backup key used as a database encryption key.
  static std::string generateBackupDataKey();
  // Generate and persist key used for encrypt backup logs.
  static std::string generateBackupLogDataKey();

  static void setDatabaseStatusAsWorkable();

public:
  static const DatabaseQueryExecutor &getQueryExecutor();
  static void clearSensitiveData();
  static void initializeQueryExecutor(std::string &databasePath);
  static bool checkIfDatabaseNeedsDeletion();
  static void reportDBOperationsFailure();
};

} // namespace comm
