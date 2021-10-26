#include "SQLiteQueryExecutor.h"
#include "Logger.h"
#include "sqlite_orm.h"

#include "entities/Media.h"
#include <sqlite3.h>
#include <memory>
#include <sstream>
#include <string>
#include <system_error>

#define ACCOUNT_ID 1

namespace comm {

using namespace sqlite_orm;

std::string SQLiteQueryExecutor::sqliteFilePath;

bool create_table(sqlite3 *db, std::string query, std::string tableName) {
  char *error;
  sqlite3_exec(db, query.c_str(), nullptr, nullptr, &error);
  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error creating '" << tableName << "' table: " << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool create_drafts_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS drafts (threadID TEXT UNIQUE PRIMARY KEY, "
      "text TEXT);";
  return create_table(db, query, "drafts");
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

bool create_persist_account_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE olm_persist_account("
      "id INTEGER UNIQUE PRIMARY KEY NOT NULL, "
      "account_data TEXT NOT NULL);";
  return create_table(db, query, "olm_persist_account");
}

bool create_persist_sessions_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE olm_persist_sessions("
      "target_user_id TEXT UNIQUE PRIMARY KEY NOT NULL, "
      "session_data TEXT NOT NULL);";
  return create_table(db, query, "olm_persist_sessions");
}

bool drop_messages_table(sqlite3 *db) {
  char *error;
  sqlite3_exec(db, "DROP TABLE IF EXISTS messages;", nullptr, nullptr, &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error dropping 'messages' table: " << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool recreate_messages_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS messages ( "
      "id TEXT UNIQUE PRIMARY KEY NOT NULL, "
      "local_id TEXT, "
      "thread TEXT NOT NULL, "
      "user TEXT NOT NULL, "
      "type INTEGER NOT NULL, "
      "future_type INTEGER, "
      "content TEXT, "
      "time INTEGER NOT NULL);";
  return create_table(db, query, "messages");
}

bool create_messages_idx_thread_time(sqlite3 *db) {
  char *error;
  sqlite3_exec(
      db,
      "CREATE INDEX messages_idx_thread_time "
      "ON messages (thread, time);",
      nullptr,
      nullptr,
      &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error creating (thread, time) index on messages table: "
               << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool create_media_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS media ( "
      "id TEXT UNIQUE PRIMARY KEY NOT NULL, "
      "container TEXT NOT NULL, "
      "thread TEXT NOT NULL, "
      "uri TEXT NOT NULL, "
      "type TEXT NOT NULL, "
      "extras TEXT NOT NULL);";
  return create_table(db, query, "media");
}

bool create_media_idx_container(sqlite3 *db) {
  char *error;
  sqlite3_exec(
      db,
      "CREATE INDEX media_idx_container "
      "ON media (container);",
      nullptr,
      nullptr,
      &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error creating (container) index on media table: " << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool create_threads_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS threads ( "
      "id TEXT UNIQUE PRIMARY KEY NOT NULL, "
      "type INTEGER NOT NULL, "
      "name TEXT, "
      "description TEXT, "
      "color TEXT NOT NULL, "
      "creation_time BIGINT NOT NULL, "
      "parent_thread_id TEXT, "
      "containing_thread_id TEXT, "
      "community TEXT, "
      "members TEXT NOT NULL, "
      "roles TEXT NOT NULL, "
      "current_user TEXT NOT NULL, "
      "source_message_id TEXT, "
      "replies_count INTEGER NOT NULL);";
  return create_table(db, query, "threads");
}

typedef std::function<bool(sqlite3 *)> MigrationFunction;
std::vector<std::pair<uint, MigrationFunction>> migrations{
    {{1, create_drafts_table},
     {2, rename_threadID_to_key},
     {4, create_persist_account_table},
     {5, create_persist_sessions_table},
     {15, create_media_table},
     {16, drop_messages_table},
     {17, recreate_messages_table},
     {18, create_messages_idx_thread_time},
     {19, create_media_idx_container},
     {20, create_threads_table}}};

void SQLiteQueryExecutor::migrate() {
  sqlite3 *db;
  sqlite3_open(SQLiteQueryExecutor::sqliteFilePath.c_str(), &db);

  std::stringstream db_path;
  db_path << "db path: " << SQLiteQueryExecutor::sqliteFilePath.c_str()
          << std::endl;
  Logger::log(db_path.str());

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

auto &SQLiteQueryExecutor::getStorage() {
  static auto storage = make_storage(
      SQLiteQueryExecutor::sqliteFilePath,
      make_table(
          "drafts",
          make_column("key", &Draft::key, unique(), primary_key()),
          make_column("text", &Draft::text)),
      make_table(
          "messages",
          make_column("id", &Message::id, unique(), primary_key()),
          make_column("local_id", &Message::local_id),
          make_column("thread", &Message::thread),
          make_column("user", &Message::user),
          make_column("type", &Message::type),
          make_column("future_type", &Message::future_type),
          make_column("content", &Message::content),
          make_column("time", &Message::time)),
      make_table(
          "olm_persist_account",
          make_column("id", &OlmPersistAccount::id),
          make_column("account_data", &OlmPersistAccount::account_data)),
      make_table(
          "olm_persist_sessions",
          make_column("target_user_id", &OlmPersistSession::target_user_id),
          make_column("session_data", &OlmPersistSession::session_data)),
      make_table(
          "media",
          make_column("id", &Media::id, unique(), primary_key()),
          make_column("container", &Media::container),
          make_column("thread", &Media::thread),
          make_column("uri", &Media::uri),
          make_column("type", &Media::type),
          make_column("extras", &Media::extras)),
      make_table(
          "threads",
          make_column("id", &Thread::id, unique(), primary_key()),
          make_column("type", &Thread::type),
          make_column("name", &Thread::name),
          make_column("description", &Thread::description),
          make_column("color", &Thread::color),
          make_column("creation_time", &Thread::creation_time),
          make_column("parent_thread_id", &Thread::parent_thread_id),
          make_column("containing_thread_id", &Thread::containing_thread_id),
          make_column("community", &Thread::community),
          make_column("members", &Thread::members),
          make_column("roles", &Thread::roles),
          make_column("current_user", &Thread::current_user),
          make_column("source_message_id", &Thread::source_message_id),
          make_column("replies_count", &Thread::replies_count)));
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

void SQLiteQueryExecutor::removeAllMessages() const {
  SQLiteQueryExecutor::getStorage().remove_all<Message>();
}

std::vector<Message> SQLiteQueryExecutor::getAllMessages() const {
  return SQLiteQueryExecutor::getStorage().get_all<Message>();
}

void SQLiteQueryExecutor::removeMessages(
    const std::vector<std::string> &ids) const {
  SQLiteQueryExecutor::getStorage().remove_all<Message>(
      where(in(&Message::id, ids)));
}

void SQLiteQueryExecutor::removeMessagesForThreads(
    const std::vector<std::string> &threadIDs) const {
  SQLiteQueryExecutor::getStorage().remove_all<Message>(
      where(in(&Message::thread, threadIDs)));
}

void SQLiteQueryExecutor::replaceMessage(const Message &message) const {
  SQLiteQueryExecutor::getStorage().replace(message);
}

void SQLiteQueryExecutor::rekeyMessage(std::string from, std::string to) const {
  auto msg = SQLiteQueryExecutor::getStorage().get<Message>(from);
  msg.id = to;
  SQLiteQueryExecutor::getStorage().replace(msg);
  SQLiteQueryExecutor::getStorage().remove<Message>(from);
}

void SQLiteQueryExecutor::removeAllMedia() const {
  SQLiteQueryExecutor::getStorage().remove_all<Media>();
}

void SQLiteQueryExecutor::removeMediaForMessages(
    const std::vector<std::string> &msg_ids) const {
  SQLiteQueryExecutor::getStorage().remove_all<Media>(
      where(in(&Media::container, msg_ids)));
}

void SQLiteQueryExecutor::removeMediaForThreads(
    const std::vector<std::string> &thread_ids) const {
  SQLiteQueryExecutor::getStorage().remove_all<Media>(
      where(in(&Media::thread, thread_ids)));
}

void SQLiteQueryExecutor::replaceMedia(const Media &media) const {
  SQLiteQueryExecutor::getStorage().replace(media);
}

void SQLiteQueryExecutor::rekeyMediaContainers(std::string from, std::string to)
    const {
  SQLiteQueryExecutor::getStorage().update_all(
      set(c(&Media::container) = to), where(c(&Media::container) == from));
}

std::vector<Thread> SQLiteQueryExecutor::getAllThreads() const {
  return SQLiteQueryExecutor::getStorage().get_all<Thread>();
};

void SQLiteQueryExecutor::removeThreads(std::vector<std::string> ids) const {
  SQLiteQueryExecutor::getStorage().remove_all<Thread>(
      where(in(&Thread::id, ids)));
};

void SQLiteQueryExecutor::replaceThread(const Thread &thread) const {
  SQLiteQueryExecutor::getStorage().replace(thread);
};

void SQLiteQueryExecutor::removeAllThreads() const {
  SQLiteQueryExecutor::getStorage().remove_all<Thread>();
};

void SQLiteQueryExecutor::beginTransaction() const {
  SQLiteQueryExecutor::getStorage().begin_transaction();
}

void SQLiteQueryExecutor::commitTransaction() const {
  SQLiteQueryExecutor::getStorage().commit();
}

void SQLiteQueryExecutor::rollbackTransaction() const {
  SQLiteQueryExecutor::getStorage().rollback();
}

std::vector<OlmPersistSession>
SQLiteQueryExecutor::getOlmPersistSessionsData() const {
  return SQLiteQueryExecutor::getStorage().get_all<OlmPersistSession>();
}

folly::Optional<std::string>
SQLiteQueryExecutor::getOlmPersistAccountData() const {
  std::vector<OlmPersistAccount> result =
      SQLiteQueryExecutor::getStorage().get_all<OlmPersistAccount>();
  if (result.size() > 1) {
    throw std::system_error(
        ECANCELED,
        std::generic_category(),
        "Multiple records found for the olm_persist_account table");
  }
  return (result.size() == 0)
      ? folly::none
      : folly::Optional<std::string>(result[0].account_data);
}

void SQLiteQueryExecutor::storeOlmPersistData(crypto::Persist persist) const {
  OlmPersistAccount persistAccount = {
      ACCOUNT_ID, std::string(persist.account.begin(), persist.account.end())};
  SQLiteQueryExecutor::getStorage().replace(persistAccount);
  for (auto it = persist.sessions.begin(); it != persist.sessions.end(); it++) {
    OlmPersistSession persistSession = {
        it->first, std::string(it->second.begin(), it->second.end())};
    SQLiteQueryExecutor::getStorage().replace(persistSession);
  }
}

} // namespace comm
