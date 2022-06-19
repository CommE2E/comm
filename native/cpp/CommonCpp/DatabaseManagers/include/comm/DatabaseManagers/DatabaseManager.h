#pragma once

#include "DatabaseQueryExecutor.h"
// TODO: includes may be conditional if we base on the preprocessor
#include "SQLiteQueryExecutor.h"

namespace comm {

class DatabaseManager {
public:
  static const DatabaseQueryExecutor &getQueryExecutor() {
    // TODO: conditionally create desired type of db manager
    // maybe basing on some preprocessor flag
    thread_local SQLiteQueryExecutor instance;
    return instance;
  }
};

} // namespace comm
