#pragma once

#include <sqlite3.h>
#include <string>

namespace comm {
class SQLiteStatementWrapper {
private:
  sqlite3_stmt *preparedSQLPtr;
  std::string onLastStepFailureMessage;

public:
  SQLiteStatementWrapper(
      sqlite3 *db,
      std::string sql,
      std::string onLastStepFailureMessage);
  SQLiteStatementWrapper(const SQLiteStatementWrapper &) = delete;
  ~SQLiteStatementWrapper();
  operator sqlite3_stmt *();
};
} // namespace comm
