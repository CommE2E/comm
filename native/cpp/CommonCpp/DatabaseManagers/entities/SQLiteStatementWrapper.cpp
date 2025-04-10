#include "SQLiteStatementWrapper.h"

#include "Logger.h"

#include <sstream>
#include <stdexcept>
#include <system_error>

namespace comm {
SQLiteStatementWrapper::SQLiteStatementWrapper(
    sqlite3 *db,
    std::string sql,
    std::string onLastStepFailureMessage) {
  int prepareSQLResult =
      sqlite3_prepare_v2(db, sql.c_str(), -1, &preparedSQLPtr, nullptr);

  if (prepareSQLResult != SQLITE_OK) {
    std::stringstream error_message;
    error_message << "Failed to prepare SQL statement. Details: "
                  << sqlite3_errstr(prepareSQLResult) << std::endl;
    Logger::log(error_message.str());
    throw std::runtime_error(error_message.str());
  }
  onLastStepFailureMessage = onLastStepFailureMessage;
}

SQLiteStatementWrapper::~SQLiteStatementWrapper() {
  int lastStepResult = sqlite3_finalize(preparedSQLPtr);
  if (lastStepResult != SQLITE_OK) {
    std::stringstream error_message;
    error_message << onLastStepFailureMessage
                  << " Details: " << sqlite3_errstr(lastStepResult)
                  << std::endl;
    Logger::log(error_message.str());
    throw std::runtime_error(error_message.str());
  }
}

SQLiteStatementWrapper::operator sqlite3_stmt *() {
  return preparedSQLPtr;
}
} // namespace comm
