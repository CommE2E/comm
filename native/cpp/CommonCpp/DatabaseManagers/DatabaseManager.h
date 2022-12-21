#pragma once

#include "DatabaseQueryExecutor.h"
// TODO: includes may be conditional if we base on the preprocessor
#include "SQLiteQueryExecutor.h"

#include <mutex>

namespace comm {

class DatabaseManager {
  static std::once_flag initialized;

  static void setDatabaseStatusAsWorkable();

public:
  static const DatabaseQueryExecutor &getQueryExecutor();
  static void clearSensitiveData();
  static void initializeQueryExecutor(std::string &databasePath);
  static bool checkIfDatabaseNeedsDeletion();
};

} // namespace comm
