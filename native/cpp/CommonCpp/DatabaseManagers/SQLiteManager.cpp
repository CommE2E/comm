#include "SQLiteManager.h"
#include "Logger.h"
#include "sqlite_orm.h"

#include <sqlite3.h>
#include <memory>
#include <sstream>
#include <string>

namespace comm {

using namespace sqlite_orm;

std::string SQLiteManager::sqliteFilePath;

void SQLiteManager::migrate() {
  sqlite3 *conn;
  sqlite3_open(SQLiteManager::sqliteFilePath.c_str(), &conn);
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

auto SQLiteManager::getStorage() {
  static auto storage = make_storage(
      SQLiteManager::sqliteFilePath,
      make_table(
          "drafts",
          make_column("key", &Draft::key, unique(), primary_key()),
          make_column("text", &Draft::text)));
  return storage;
}

SQLiteManager::SQLiteManager() {
  this->migrate();
  SQLiteManager::getStorage().sync_schema(true);
}

std::string SQLiteManager::getDraft(std::string key) const {
  std::unique_ptr<Draft> draft =
      SQLiteManager::getStorage().get_pointer<Draft>(key);
  return (draft == nullptr) ? "" : draft->text;
}

void SQLiteManager::updateDraft(std::string key, std::string text) const {
  Draft draft = {key, text};
  SQLiteManager::getStorage().replace(draft);
}

std::vector<Draft> SQLiteManager::getAllDrafts() const {
  return SQLiteManager::getStorage().get_all<Draft>();
}

} // namespace comm
