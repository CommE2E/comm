#pragma once

#include "SQLiteStatementWrapper.h"
#include <iostream>
#include <sstream>
#include <vector>

namespace comm {

template <typename T>
std::vector<T> getAllEntities(sqlite3 *db, std::string getAllEntitiesSQL) {
  SQLiteStatementWrapper preparedSQL(
      db, getAllEntitiesSQL, "Failed to retrieve entities.");
  std::vector<T> allEntities;

  for (int stepResult = sqlite3_step(preparedSQL); stepResult == SQLITE_ROW;
       stepResult = sqlite3_step(preparedSQL)) {
    allEntities.emplace_back(T::fromSQLResult(preparedSQL, 0));
  }
  return allEntities;
}

template <typename T>
std::unique_ptr<T> getEntityByPrimaryKey(
    sqlite3 *db,
    std::string getEntityByPrimaryKeySQL,
    std::string primaryKey) {
  SQLiteStatementWrapper preparedSQL(
      db, getEntityByPrimaryKeySQL, "Failed to fetch row by primary key.");
  int bindResult =
      sqlite3_bind_text(preparedSQL, 1, primaryKey.c_str(), -1, SQLITE_STATIC);
  if (bindResult != SQLITE_OK) {
    std::stringstream error_message;
    error_message << "Failed to bind primary key to SQL statement. Details: "
                  << sqlite3_errstr(bindResult) << std::endl;
    throw std::runtime_error(error_message.str());
  }

  int stepResult = sqlite3_step(preparedSQL);
  if (stepResult == SQLITE_DONE) {
    return nullptr;
  }

  if (stepResult != SQLITE_ROW) {
    std::stringstream error_message;
    error_message << "Failed to fetch row by primary key. Details: "
                  << sqlite3_errstr(stepResult) << std::endl;
    throw std::runtime_error(error_message.str());
  }

  T entity = T::fromSQLResult(preparedSQL, 0);
  return std::make_unique<T>(std::move(entity));
}

} // namespace comm
