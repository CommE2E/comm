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

template <typename T>
std::unique_ptr<T> getEntityByPrimaryKey(
    sqlite3 *db,
    std::string getEntityByPrimaryKeySQL,
    std::string primaryKey) {
  sqlite3_stmt *preparedSQL = getPreparedSQL(db, getEntityByPrimaryKeySQL);
  int bindResult =
      sqlite3_bind_text(preparedSQL, 1, primaryKey.c_str(), -1, SQLITE_STATIC);
  if (bindResult != SQLITE_OK) {
    std::stringstream error_message;
    error_message << "Failed to bind primary key to SQL statement. Details: "
                  << sqlite3_errstr(bindResult) << std::endl;
    sqlite3_finalize(preparedSQL);
    throw std::runtime_error(error_message.str());
  }

  int stepResult = sqlite3_step(preparedSQL);
  if (stepResult == SQLITE_DONE) {
    sqlite3_finalize(preparedSQL);
    return nullptr;
  }

  if (stepResult != SQLITE_ROW) {
    std::stringstream error_message;
    error_message << "Failed to fetch row by primary key. Details: "
                  << sqlite3_errstr(stepResult) << std::endl;
    sqlite3_finalize(preparedSQL);
    throw std::runtime_error(error_message.str());
  }

  T entity = T::fromSQLResult(preparedSQL, 0);
  sqlite3_finalize(preparedSQL);

  return std::make_unique<T>(std::move(entity));
}

template <typename T>
void replaceEntity(sqlite3 *db, std::string replaceEntitySQL, const T &entity) {
  sqlite3_stmt *preparedSQL = getPreparedSQL(db, replaceEntitySQL);
  // "REPLACE INTO ..." query is assumed since
  // it was used by orm previously
  int bindResult = entity.bindToSQL(preparedSQL, 1);
  if (bindResult != SQLITE_OK) {
    std::stringstream error_message;
    error_message << "Failed to bind entity to SQL statement. Details: "
                  << sqlite3_errstr(bindResult) << std::endl;
    sqlite3_finalize(preparedSQL);
    throw std::runtime_error(error_message.str());
  }

  int stepResult = sqlite3_step(preparedSQL);
  finalizePreparedStatement(
      preparedSQL, stepResult, "Failed to replace entity.");
}

void removeAllEntities(sqlite3 *db, std::string removeAllEntitiesSQL) {
  sqlite3_stmt *preparedSQL = getPreparedSQL(db, removeAllEntitiesSQL);
  int stepResult = sqlite3_step(preparedSQL);
  finalizePreparedStatement(
      preparedSQL, stepResult, "Failed to remove all entities.");
}

void removeEntitiesByKeys(
    sqlite3 *db,
    std::string removeEntitiesByKeysSQL,
    const std::vector<std::string> &keys) {
  sqlite3_stmt *preparedSQL = getPreparedSQL(db, removeEntitiesByKeysSQL);
  for (int i = 0; i < keys.size(); i++) {
    int bindResult = sqlite3_bind_text(
        preparedSQL, i + 1, keys[i].c_str(), -1, SQLITE_STATIC);
    if (bindResult != SQLITE_OK) {
      std::stringstream error_message;
      error_message << "Failed to bind key to SQL statement. Details: "
                    << sqlite3_errstr(bindResult) << std::endl;
      sqlite3_finalize(preparedSQL);
      throw std::runtime_error(error_message.str());
    }
  }

  int stepResult = sqlite3_step(preparedSQL);
  finalizePreparedStatement(
      preparedSQL, stepResult, "Failed to remove entities by keys.");
}

void rekeyAllEntities(
    sqlite3 *db,
    std::string rekeyAllEntitiesSQL,
    std::string from,
    std::string to) {
  sqlite3_stmt *preparedSQL = getPreparedSQL(db, rekeyAllEntitiesSQL);

  sqlite3_bind_text(preparedSQL, 1, to.c_str(), -1, SQLITE_STATIC);
  int bindResult =
      sqlite3_bind_text(preparedSQL, 2, from.c_str(), -1, SQLITE_STATIC);

  if (bindResult != SQLITE_OK) {
    std::stringstream error_message;
    error_message << "Failed to bind key to SQL statement. Details: "
                  << sqlite3_errstr(bindResult) << std::endl;
    sqlite3_finalize(preparedSQL);
    throw std::runtime_error(error_message.str());
  }

  int stepResult = sqlite3_step(preparedSQL);
  finalizePreparedStatement(
      preparedSQL, stepResult, "Failed to rekey all entities.");
}

std::string getSQLStatementArray(int length) {
  std::stringstream array;
  array << "(";
  for (int i = 0; i < length - 1; i++) {
    array << "?, ";
  }
  array << "?);";
  return array.str();
}

void executeQuery(sqlite3 *db, std::string querySQL) {
  char *err;
  sqlite3_exec(db, querySQL.c_str(), nullptr, nullptr, &err);
  if (err) {
    std::stringstream error_message;
    error_message << "Failed to execute query. Details: " << err << std::endl;
    throw std::runtime_error(error_message.str());
  }
}

} // namespace comm
