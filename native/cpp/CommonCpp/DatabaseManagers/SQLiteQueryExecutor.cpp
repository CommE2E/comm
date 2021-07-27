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

bool create_drafts_table(sqlite3 *db) {
  char *error;
  sqlite3_exec(
      db,
      "CREATE TABLE IF NOT EXISTS drafts (threadID TEXT UNIQUE PRIMARY KEY, "
      "text TEXT);",
      nullptr,
      nullptr,
      &error);
  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error creating 'drafts' table: " << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool rename_threadID_to_key(sqlite3 *db) {
  sqlite3_stmt *key_column_stmt;
  sqlite3_prepare_v2(
      db,
      "SELECT name AS col_name FROM pragma_table_xinfo ('drafts') WHERE "
      "col_name='key';",
      -1,
      &key_column_stmt,
      nullptr);
  sqlite3_step(key_column_stmt);

  auto num_bytes = sqlite3_column_bytes(key_column_stmt, 0);
  sqlite3_finalize(key_column_stmt);
  if (num_bytes) {
    return true;
  }

  char *error;
  sqlite3_exec(
      db,
      "ALTER TABLE drafts RENAME COLUMN `threadID` TO `key`;",
      nullptr,
      nullptr,
      &error);
  if (error) {
    std::ostringstream stringStream;
    stringStream << "Error occurred renaming threadID column in drafts table "
                 << "to key: " << error;
    Logger::log(stringStream.str());
    sqlite3_free(error);
    return false;
  }
  return true;
}

bool create_messages_table(sqlite3 *db) {
  char *error;
  sqlite3_exec(
      db,
      "CREATE TABLE IF NOT EXISTS messages ( "
      "id INTEGER UNIQUE PRIMARY KEY NOT NULL, "
      "thread INTEGER NOT NULL, "
      "user INTEGER NOT NULL, "
      "type INTEGER NOT NULL, "
      "future_type INTEGER, "
      "content TEXT, "
      "time INTEGER NOT NULL, "
      "creation TEXT);",
      nullptr,
      nullptr,
      &error);
  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error creating 'messages' table: " << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

typedef bool (*MigrationFunction)(sqlite3 *db);
std::vector<std::pair<uint, MigrationFunction>> migrations{
    {{1, create_drafts_table},
     {2, rename_threadID_to_key},
     {3, create_messages_table}}};

void SQLiteQueryExecutor::migrate() {
  sqlite3 *db;
  sqlite3_open(SQLiteQueryExecutor::sqliteFilePath.c_str(), &db);

  sqlite3_stmt *user_version_stmt;
  sqlite3_prepare_v2(
      db, "PRAGMA user_version;", -1, &user_version_stmt, nullptr);
  sqlite3_step(user_version_stmt);

  int current_user_version = sqlite3_column_int(user_version_stmt, 0);
  sqlite3_finalize(user_version_stmt);

  std::stringstream version_msg;
  version_msg << "db version: " << current_user_version << std::endl;
  Logger::log(version_msg.str());

  for (const auto &[idx, migration] : migrations) {
    if (idx <= current_user_version) {
      continue;
    }

    std::stringstream migration_msg;
    sqlite3_exec(db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);
    if (!migration(db)) {
      migration_msg << "migration " << idx << " failed." << std::endl;
      Logger::log(migration_msg.str());
      break;
    };

    std::stringstream update_version;
    update_version << "PRAGMA user_version=" << idx << ";";
    auto update_version_str = update_version.str();

    sqlite3_exec(db, update_version_str.c_str(), nullptr, nullptr, nullptr);
    sqlite3_exec(db, "END TRANSACTION;", nullptr, nullptr, nullptr);

    migration_msg << "migration " << idx << " succeeded." << std::endl;
    Logger::log(migration_msg.str());
  }

  sqlite3_close(db);
}

auto SQLiteQueryExecutor::getStorage() {
  static auto storage = make_storage(
      SQLiteQueryExecutor::sqliteFilePath,
      make_table(
          "drafts",
          make_column("key", &Draft::key, unique(), primary_key()),
          make_column("text", &Draft::text)),
      make_table(
          "messages",
          make_column("id", &Message::id, unique(), primary_key()),
          make_column("thread", &Message::thread),
          make_column("user", &Message::user),
          make_column("type", &Message::type),
          make_column("future_type", &Message::future_type),
          make_column("content", &Message::content),
          make_column("time", &Message::time),
          make_column("creation", &Message::creation)));
  return storage;
}

SQLiteQueryExecutor::SQLiteQueryExecutor() {
  this->migrate();
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
