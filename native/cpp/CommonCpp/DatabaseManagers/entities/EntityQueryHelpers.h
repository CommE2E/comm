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

} // namespace comm
