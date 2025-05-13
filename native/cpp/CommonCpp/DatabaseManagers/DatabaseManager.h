#pragma once

#include "DatabaseQueryExecutor.h"
// TODO: includes may be conditional if we base on the preprocessor
#include "SQLiteQueryExecutor.h"

#include <mutex>

namespace comm {

class DatabaseManager {
  // Indicate that at least one instance of SQLiteQueryExecutor was created,
  // which is identical to finishing the migration process and having a fully
  // operational database that can be used by application logic.
  static std::once_flag queryExecutorCreationIndicated;

  static void setDatabaseStatusAsWorkable();
  static void indicateQueryExecutorCreation();

public:
  static const DatabaseQueryExecutor &getQueryExecutor();
  static void clearSensitiveData();
  static void initializeQueryExecutor(std::string &databasePath);
  static bool checkIfDatabaseNeedsDeletion();
  static void reportDBOperationsFailure();
};

} // namespace comm
