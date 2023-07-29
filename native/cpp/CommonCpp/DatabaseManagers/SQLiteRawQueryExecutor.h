#pragma once

#include <sqlite3.h>
#include <string>

namespace comm {

class SQLiteRawQueryExecutor {

public:
  static void migrate(sqlite3 *db);
  static void setEncryptionKey(sqlite3 *db, const std::string &encryptionKey);
  static void traceQueries(sqlite3 *db);
};

} // namespace comm
