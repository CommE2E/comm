#include "SQLiteQueryExecutor.h"
#include "Logger.h"
#include "sqlite_orm.h"

#include <sqlite3.h>
#include <memory>
#include <sstream>
#include <string>

namespace comm {

using namespace sqlite_orm;

std::string SQLiteQueryExecutor::sqliteFilePath;

void SQLiteQueryExecutor::migrate() {
  sqlite3 *conn;
  sqlite3_open(SQLiteQueryExecutor::sqliteFilePath.c_str(), &conn);
  char *error;
  sqlite3_exec(
      conn,
      "ALTER TABLE drafts RENAME COLUMN `threadID` TO `key`",
      nullptr,
      nullptr,
      &error);
  if (error) {
    std::ostringstream stringStream;
    stringStream << "Error occurred renaming threadID column in drafts table "
                 << "to key: " << error;
    Logger::log(stringStream.str());
    sqlite3_free(error);
  }
  sqlite3_close(conn);
}

auto SQLiteQueryExecutor::getStorage() {
  static auto storage = make_storage(
      SQLiteQueryExecutor::sqliteFilePath,
      make_table(
          "drafts",
          make_column("key", &Draft::key, unique(), primary_key()),
          make_column("text", &Draft::text)));
  return storage;
}

SQLiteQueryExecutor::SQLiteQueryExecutor() {
  this->migrate();
  SQLiteQueryExecutor::getStorage().sync_schema(true);
}

std::string SQLiteQueryExecutor::getDraft(std::string key) const {
  std::unique_ptr<Draft> draft =
      SQLiteQueryExecutor::getStorage().get_pointer<Draft>(key);
  return (draft == nullptr) ? "" : draft->text;
}

void SQLiteQueryExecutor::updateDraft(std::string key, std::string text) const {
  Draft draft = {key, text};
  SQLiteQueryExecutor::getStorage().replace(draft);
}

bool SQLiteQueryExecutor::moveDraft(std::string oldKey, std::string newKey)
    const {
  std::unique_ptr<Draft> draft =
      SQLiteQueryExecutor::getStorage().get_pointer<Draft>(oldKey);
  if (draft == nullptr) {
    return false;
  }
  draft->key = newKey;
  SQLiteQueryExecutor::getStorage().replace(*draft);
  SQLiteQueryExecutor::getStorage().remove<Draft>(oldKey);
  return true;
}

std::vector<Draft> SQLiteQueryExecutor::getAllDrafts() const {
  return SQLiteQueryExecutor::getStorage().get_all<Draft>();
}

void SQLiteQueryExecutor::removeAllDrafts() const {
  SQLiteQueryExecutor::getStorage().remove_all<Draft>();
}

} // namespace comm
