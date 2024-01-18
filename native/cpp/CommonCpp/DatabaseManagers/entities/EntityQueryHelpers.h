#include <sqlite3.h>
#include <sstream>
#include <stdexcept>
#include <string>
#include <system_error>
#include <vector>

namespace comm {

sqlite3_stmt *getPreparedSQL(sqlite3 *db, std::string sql) {
  sqlite3_stmt *preparedSQL;
  int prepareSQLResult =
      sqlite3_prepare_v2(db, sql.c_str(), -1, &preparedSQL, nullptr);

  if (prepareSQLResult != SQLITE_OK) {
    std::stringstream error_message;
    error_message << "Failed to prepare SQL statement. Details: "
                  << sqlite3_errstr(prepareSQLResult) << std::endl;
    throw std::runtime_error(error_message.str());
  }
  return preparedSQL;
}

void finalizePreparedStatement(
    sqlite3_stmt *preparedSQL,
    int lastStepResult,
    std::string onLastStepFailureMessage) {
  sqlite3_finalize(preparedSQL);

  if (lastStepResult != SQLITE_DONE) {
    std::stringstream error_message;
    error_message << onLastStepFailureMessage
                  << " Details: " << sqlite3_errstr(lastStepResult)
                  << std::endl;
    throw std::runtime_error(error_message.str());
  }
}

template <typename T>
std::vector<T> getAllEntities(sqlite3 *db, std::string getAllEntitiesSQL) {
  sqlite3_stmt *preparedSQL = getPreparedSQL(db, getAllEntitiesSQL);
  std::vector<T> allEntities;
  int stepResult;

  while ((stepResult = sqlite3_step(preparedSQL)) == SQLITE_ROW) {
    T entity = T::fromSQLResult(preparedSQL, 0);
    allEntities.push_back(std::move(entity));
  }

  finalizePreparedStatement(
      preparedSQL, stepResult, "Failed to retrieve entities.");
  return allEntities;
}

} // namespace comm
