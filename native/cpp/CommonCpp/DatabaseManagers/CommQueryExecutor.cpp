#include "CommQueryExecutor.h"
#include "Logger.h"
#include "sqlite_orm.h"

#include <sqlite3.h>
#include <cstdio>
#include <iostream>
#include <string>

#ifdef EMSCRIPTEN
#include <emscripten/bind.h>
#endif

namespace comm {

using namespace sqlite_orm;

std::string DB_PATH = "test.sqlite";
struct Test {
  std::string id;
  std::string data;
};

std::string CommQueryExecutor::testDBOperation() {
  Logger::log("Logger works!");

  sqlite3 *db;
  sqlite3_open(DB_PATH.c_str(), &db);

  std::string createTableQuery =
      "CREATE TABLE IF NOT EXISTS test ("
      "	 id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 data TEXT NOT NULL"
      ");";

  char *error = nullptr;
  sqlite3_exec(db, createTableQuery.c_str(), nullptr, nullptr, &error);

  if (error != nullptr) {
    std::ostringstream stringStream;
    stringStream << "Error creating test table: " << error;
    sqlite3_free(error);
    return stringStream.str();
  }

  sqlite3_close(db);

  auto storage = make_storage(
      DB_PATH.c_str(),
      make_table(
          "test",
          make_column("id", &Test::id, primary_key()),
          make_column("data", &Test::data)));

  Test test1{"a", "data"};
  Test test2{"b", "data"};
  storage.replace(test1);
  storage.replace(test2);

  auto tests = storage.get_all<Test>();
  if (tests.size() == 2) {
    std::remove(DB_PATH.c_str());
    return "sqlite3 and sqlite_orm works on web";
  } else {
    return "there were some problems...";
  }
}

} // namespace comm

#ifdef EMSCRIPTEN
EMSCRIPTEN_BINDINGS(CommQueryExecutor) {
  emscripten::class_<comm::CommQueryExecutor>("CommQueryExecutor")
      .constructor<>()
      .class_function(
          "testDBOperation", &comm::CommQueryExecutor::testDBOperation);
}
#endif
