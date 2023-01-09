#pragma once

#include "DatabaseQueryExecutor.h"
// TODO: includes may be conditional if we base on the preprocessor
#include "SQLiteQueryExecutor.h"

namespace comm {

class DatabaseManager {
public:
  static const DatabaseQueryExecutor &getQueryExecutor();
  static void clearSensitiveData();
};

} // namespace comm
