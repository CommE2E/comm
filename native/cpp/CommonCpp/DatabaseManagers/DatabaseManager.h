#pragma once

#include "DatabaseQueryExecutor.h"
// TODO: includes may be conditional if we base on the preprocessor
#include "SQLiteQueryExecutor.h"

#include <mutex>

namespace comm {

class DatabaseManager {
  // Path and keys for the main database. DatabaseManager owns, manages, and
  // passes them to the appropriate SQLiteQueryExecutor when creating the
  // instance. It is important to keep them here and up-to-date because
  // SQLiteQueryExecutor is a thread_local, and an instance can be created at
  // any time; therefore should use the correct properties.
  static std::string sqliteFilePath;
  static std::string backupDataKey;
  static std::string backupLogDataKey;

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
