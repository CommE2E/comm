#pragma once

#include "Logger.h"
#include "SQLiteDataConverters.h"
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
std::unique_ptr<T>
getEntityByPrimaryKeyCommon(SQLiteStatementWrapper &preparedSQL) {
  int stepResult = sqlite3_step(preparedSQL);
  if (stepResult == SQLITE_DONE) {
    return nullptr;
  }

  if (stepResult != SQLITE_ROW) {
    std::stringstream error_message;
    error_message << "Failed to fetch row by primary key. Details: "
                  << sqlite3_errstr(stepResult) << std::endl;
    Logger::log(error_message.str());
    throw std::runtime_error(error_message.str());
  }

  T entity = T::fromSQLResult(preparedSQL, 0);
  return std::make_unique<T>(std::move(entity));
}

template <typename T>
std::unique_ptr<T> getEntityByPrimaryKey(
    sqlite3 *db,
    std::string getEntityByPrimaryKeySQL,
    std::string primaryKey) {
  SQLiteStatementWrapper preparedSQL(
      db, getEntityByPrimaryKeySQL, "Failed to fetch row by primary key.");
  int bindResult = bindStringToSQL(primaryKey, preparedSQL, 1);
  if (bindResult != SQLITE_OK) {
    std::stringstream error_message;
    error_message << "Failed to bind primary key to SQL statement. Details: "
                  << sqlite3_errstr(bindResult) << std::endl;
    Logger::log(error_message.str());
    throw std::runtime_error(error_message.str());
  }

  return getEntityByPrimaryKeyCommon<T>(preparedSQL);
}

template <typename T>
std::unique_ptr<T> getEntityByIntegerPrimaryKey(
    sqlite3 *db,
    std::string getEntityByPrimaryKeySQL,
    int primaryKey) {
  SQLiteStatementWrapper preparedSQL(
      db, getEntityByPrimaryKeySQL, "Failed to fetch row by primary key.");
  int bindResult = bindIntToSQL(primaryKey, preparedSQL, 1);
  if (bindResult != SQLITE_OK) {
    std::stringstream error_message;
    error_message << "Failed to bind primary key to SQL statement. Details: "
                  << sqlite3_errstr(bindResult) << std::endl;
    Logger::log(error_message.str());
    throw std::runtime_error(error_message.str());
  }
  return getEntityByPrimaryKeyCommon<T>(preparedSQL);
}

template <typename T>
std::vector<T> getAllEntitiesByPrimaryKeys(
    sqlite3 *db,
    std::string getAllEntitiesSQL,
    const std::vector<std::string> &keys) {
  SQLiteStatementWrapper preparedSQL(
      db, getAllEntitiesSQL, "Failed to fetch entities by primary key.");

  for (int i = 0; i < keys.size(); i++) {
    int bindResult = bindStringToSQL(keys[i], preparedSQL, i + 1);
    if (bindResult != SQLITE_OK) {
      std::stringstream error_message;
      error_message << "Failed to bind key to SQL statement. Details: "
                    << sqlite3_errstr(bindResult) << std::endl;
      sqlite3_finalize(preparedSQL);
      Logger::log(error_message.str());
      throw std::runtime_error(error_message.str());
    }
  }

  std::vector<T> allEntities;

  for (int stepResult = sqlite3_step(preparedSQL); stepResult == SQLITE_ROW;
       stepResult = sqlite3_step(preparedSQL)) {
    allEntities.emplace_back(T::fromSQLResult(preparedSQL, 0));
  }
  return allEntities;
}

template <typename T>
void replaceEntity(sqlite3 *db, std::string replaceEntitySQL, const T &entity) {
  SQLiteStatementWrapper preparedSQL(
      db, replaceEntitySQL, "Failed to replace entity.");
  // "REPLACE INTO ..." query is assumed since
  // it was used by orm previously
  int bindResult = entity.bindToSQL(preparedSQL, 1);
  if (bindResult != SQLITE_OK) {
    std::stringstream error_message;
    error_message << "Failed to bind entity to SQL statement. Details: "
                  << sqlite3_errstr(bindResult) << std::endl;
    Logger::log(error_message.str());
    throw std::runtime_error(error_message.str());
  }

  sqlite3_step(preparedSQL);
}

void removeAllEntities(sqlite3 *db, std::string removeAllEntitiesSQL) {
  SQLiteStatementWrapper preparedSQL(
      db, removeAllEntitiesSQL, "Failed to remove all entities.");
  sqlite3_step(preparedSQL);
}

void removeEntitiesByKeys(
    sqlite3 *db,
    std::string removeEntitiesByKeysSQL,
    const std::vector<std::string> &keys) {
  SQLiteStatementWrapper preparedSQL(
      db, removeEntitiesByKeysSQL, "Failed to remove entities by keys.");
  for (int i = 0; i < keys.size(); i++) {
    int bindResult = bindStringToSQL(keys[i], preparedSQL, i + 1);
    if (bindResult != SQLITE_OK) {
      std::stringstream error_message;
      error_message << "Failed to bind key to SQL statement. Details: "
                    << sqlite3_errstr(bindResult) << std::endl;
      sqlite3_finalize(preparedSQL);
      Logger::log(error_message.str());
      throw std::runtime_error(error_message.str());
    }
  }

  sqlite3_step(preparedSQL);
}

void rekeyAllEntities(
    sqlite3 *db,
    std::string rekeyAllEntitiesSQL,
    std::string from,
    std::string to) {
  SQLiteStatementWrapper preparedSQL(
      db, rekeyAllEntitiesSQL, "Failed to rekey all entities.");

  bindStringToSQL(to, preparedSQL, 1);
  int bindResult = bindStringToSQL(from, preparedSQL, 2);

  if (bindResult != SQLITE_OK) {
    std::stringstream error_message;
    error_message << "Failed to bind key to SQL statement. Details: "
                  << sqlite3_errstr(bindResult) << std::endl;
    Logger::log(error_message.str());
    throw std::runtime_error(error_message.str());
  }

  sqlite3_step(preparedSQL);
}

std::string getSQLStatementArray(int length) {
  std::stringstream array;
  array << "(";
  for (int i = 0; i < length - 1; i++) {
    array << "?, ";
  }
  array << "?)";
  return array.str();
}

void executeQuery(sqlite3 *db, std::string querySQL) {
  char *err;
  sqlite3_exec(db, querySQL.c_str(), nullptr, nullptr, &err);
  if (err) {
    std::stringstream error_message;
    error_message << "Failed to execute query. Details: " << err << std::endl;
    sqlite3_free(err);
    Logger::log(error_message.str());
    throw std::runtime_error(error_message.str());
  }
}

} // namespace comm
