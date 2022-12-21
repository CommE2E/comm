#include "DatabaseManager.h"
#include "SQLiteQueryExecutor.h"

namespace comm {

const DatabaseQueryExecutor &DatabaseManager::getQueryExecutor() {
  //  TODO: conditionally create desired type of db manager
  //  maybe basing on some preprocessor flag
  thread_local SQLiteQueryExecutor instance;
  return instance;
}

} // namespace comm
