#include "SQLiteQueryExecutor.h"
#include "CommSecureStore.h"
#include "Logger.h"
#include "sqlite_orm.h"

#include "entities/Metadata.h"
#include <fstream>
#include <iostream>
#include <thread>

#define ACCOUNT_ID 1

namespace comm {

using namespace sqlite_orm;

std::string SQLiteQueryExecutor::sqliteFilePath;
std::string SQLiteQueryExecutor::encryptionKey;
std::once_flag SQLiteQueryExecutor::initialized;
int SQLiteQueryExecutor::sqlcipherEncryptionKeySize = 64;
std::string SQLiteQueryExecutor::secureStoreEncryptionKeyID =
    "comm.encryptionKey";

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
      "CREATE TABLE IF NOT EXISTS olm_persist_account("
      "id INTEGER UNIQUE PRIMARY KEY NOT NULL, "
      "account_data TEXT NOT NULL);";
  return create_table(db, query, "olm_persist_account");
}

bool create_persist_sessions_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS olm_persist_sessions("
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
      "CREATE INDEX IF NOT EXISTS messages_idx_thread_time "
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
      "CREATE INDEX IF NOT EXISTS media_idx_container "
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

bool update_threadID_for_pending_threads_in_drafts(sqlite3 *db) {
  char *error;
  sqlite3_exec(
      db,
      "UPDATE drafts SET key = "
      "REPLACE(REPLACE(REPLACE(REPLACE(key, 'type4/', ''),"
      "'type5/', ''),'type6/', ''),'type7/', '')"
      "WHERE key LIKE 'pending/%'",
      nullptr,
      nullptr,
      &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error update pending threadIDs on drafts table: " << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool enable_write_ahead_logging_mode(sqlite3 *db) {
  char *error;
  sqlite3_exec(db, "PRAGMA journal_mode=wal;", nullptr, nullptr, &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error enabling write-ahead logging mode: " << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool create_metadata_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS metadata ( "
      "name TEXT UNIQUE PRIMARY KEY NOT NULL, "
      "data TEXT);";
  return create_table(db, query, "metadata");
}

bool add_not_null_constraint_to_drafts(sqlite3 *db) {
  char *error;
  sqlite3_exec(
      db,
      "CREATE TABLE IF NOT EXISTS temporary_drafts ("
      "key TEXT UNIQUE PRIMARY KEY NOT NULL, "
      "text TEXT NOT NULL);"
      "INSERT INTO temporary_drafts SELECT * FROM drafts "
      "WHERE key IS NOT NULL AND text IS NOT NULL;"
      "DROP TABLE drafts;"
      "ALTER TABLE temporary_drafts RENAME TO drafts;",
      nullptr,
      nullptr,
      &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error adding NOT NULL constraint to drafts table: " << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool add_not_null_constraint_to_metadata(sqlite3 *db) {
  char *error;
  sqlite3_exec(
      db,
      "CREATE TABLE IF NOT EXISTS temporary_metadata ("
      "name TEXT UNIQUE PRIMARY KEY NOT NULL, "
      "data TEXT NOT NULL);"
      "INSERT INTO temporary_metadata SELECT * FROM metadata "
      "WHERE data IS NOT NULL;"
      "DROP TABLE metadata;"
      "ALTER TABLE temporary_metadata RENAME TO metadata;",
      nullptr,
      nullptr,
      &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error adding NOT NULL constraint to metadata table: "
               << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool add_avatar_column_to_threads_table(sqlite3 *db) {
  char *error;
  sqlite3_exec(
      db,
      "ALTER TABLE threads ADD COLUMN avatar TEXT;",
      nullptr,
      nullptr,
      &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error adding avatar column to threads table: " << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool add_pinned_count_column_to_threads(sqlite3 *db) {
  sqlite3_stmt *pinned_column_stmt;
  sqlite3_prepare_v2(
      db,
      "SELECT name AS col_name FROM pragma_table_xinfo ('threads') WHERE "
      "col_name='pinned_count';",
      -1,
      &pinned_column_stmt,
      nullptr);
  sqlite3_step(pinned_column_stmt);

  auto num_bytes = sqlite3_column_bytes(pinned_column_stmt, 0);
  sqlite3_finalize(pinned_column_stmt);

  if (num_bytes) {
    return true;
  }

  char *error;
  sqlite3_exec(
      db,
      "ALTER TABLE threads ADD COLUMN pinned_count INTEGER NOT NULL DEFAULT 0;",
      nullptr,
      nullptr,
      &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error adding pinned_count column to threads table: "
               << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool create_message_store_threads_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS message_store_threads ("
      "	 id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 start_reached INTEGER NOT NULL,"
      "	 last_navigated_to BIGINT NOT NULL,"
      "	 last_pruned BIGINT NOT NULL"
      ");";
  return create_table(db, query, "message_store_threads");
}

bool create_schema(sqlite3 *db) {
  char *error;
  sqlite3_exec(
      db,
      "CREATE TABLE IF NOT EXISTS drafts ("
      "	 key TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 text TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS messages ("
      "	 id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 local_id TEXT,"
      "	 thread TEXT NOT NULL,"
      "	 user TEXT NOT NULL,"
      "	 type INTEGER NOT NULL,"
      "	 future_type INTEGER,"
      "	 content TEXT,"
      "	 time INTEGER NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS olm_persist_account ("
      "	 id INTEGER UNIQUE PRIMARY KEY NOT NULL,"
      "	 account_data TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS olm_persist_sessions ("
      "	 target_user_id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 session_data TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS media ("
      "	 id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 container TEXT NOT NULL,"
      "	 thread TEXT NOT NULL,"
      "	 uri TEXT NOT NULL,"
      "	 type TEXT NOT NULL,"
      "	 extras TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS threads ("
      "	 id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 type INTEGER NOT NULL,"
      "	 name TEXT,"
      "	 description TEXT,"
      "	 color TEXT NOT NULL,"
      "	 creation_time BIGINT NOT NULL,"
      "	 parent_thread_id TEXT,"
      "	 containing_thread_id TEXT,"
      "	 community TEXT,"
      "	 members TEXT NOT NULL,"
      "	 roles TEXT NOT NULL,"
      "	 current_user TEXT NOT NULL,"
      "	 source_message_id TEXT,"
      "	 replies_count INTEGER NOT NULL,"
      "	 avatar TEXT,"
      "	 pinned_count INTEGER NOT NULL DEFAULT 0"
      ");"

      "CREATE TABLE IF NOT EXISTS metadata ("
      "	 name TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 data TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS message_store_threads ("
      "	 id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 start_reached INTEGER NOT NULL,"
      "	 last_navigated_to BIGINT NOT NULL,"
      "	 last_pruned BIGINT NOT NULL"
      ");"

      "CREATE INDEX IF NOT EXISTS media_idx_container"
      "  ON media (container);"

      "CREATE INDEX IF NOT EXISTS messages_idx_thread_time"
      "  ON messages (thread, time);",
      nullptr,
      nullptr,
      &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error creating tables: " << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

void set_encryption_key(sqlite3 *db) {
  std::string set_encryption_key_query =
      "PRAGMA key = \"x'" + SQLiteQueryExecutor::encryptionKey + "'\";";

  char *error_set_key;
  sqlite3_exec(
      db, set_encryption_key_query.c_str(), nullptr, nullptr, &error_set_key);

  if (error_set_key) {
    std::ostringstream error_message;
    error_message << "Failed to set encryption key: " << error_set_key;
    throw std::system_error(
        ECANCELED, std::generic_category(), error_message.str());
  }
}

int get_database_version(sqlite3 *db) {
  sqlite3_stmt *user_version_stmt;
  sqlite3_prepare_v2(
      db, "PRAGMA user_version;", -1, &user_version_stmt, nullptr);
  sqlite3_step(user_version_stmt);

  int current_user_version = sqlite3_column_int(user_version_stmt, 0);
  sqlite3_finalize(user_version_stmt);
  return current_user_version;
}

bool set_database_version(sqlite3 *db, int db_version) {
  std::stringstream update_version;
  update_version << "PRAGMA user_version=" << db_version << ";";
  auto update_version_str = update_version.str();

  char *error;
  sqlite3_exec(db, update_version_str.c_str(), nullptr, nullptr, &error);

  if (!error) {
    return true;
  }

  std::ostringstream errorStream;
  errorStream << "Error setting database version to " << db_version << ": "
              << error;
  Logger::log(errorStream.str());

  sqlite3_free(error);
  return false;
}

void trace_queries(sqlite3 *db) {
  int error_code = sqlite3_trace_v2(
      db,
      SQLITE_TRACE_PROFILE,
      [](unsigned, void *, void *preparedStatement, void *) {
        sqlite3_stmt *statement = (sqlite3_stmt *)preparedStatement;
        char *sql = sqlite3_expanded_sql(statement);
        if (sql != nullptr) {
          std::string sqlStr(sql);
          // TODO: send logs to backup here
        }
        return 0;
      },
      NULL);
  if (error_code != SQLITE_OK) {
    std::ostringstream error_message;
    error_message << "Failed to set trace callback, error code: " << error_code;
    throw std::system_error(
        ECANCELED, std::generic_category(), error_message.str());
  }
}

void on_database_open(sqlite3 *db) {
  set_encryption_key(db);
  trace_queries(db);
}

bool file_exists(const std::string &file_path) {
  std::ifstream file(file_path.c_str());
  return file.good();
}

void attempt_delete_file(
    const std::string &file_path,
    const char *error_message) {
  if (std::remove(file_path.c_str())) {
    throw std::system_error(errno, std::generic_category(), error_message);
  }
}

void attempt_rename_file(
    const std::string &old_path,
    const std::string &new_path,
    const char *error_message) {
  if (std::rename(old_path.c_str(), new_path.c_str())) {
    throw std::system_error(errno, std::generic_category(), error_message);
  }
}

bool is_database_queryable(sqlite3 *db, bool use_encryption_key) {
  char *err_msg;
  sqlite3_open(SQLiteQueryExecutor::sqliteFilePath.c_str(), &db);
  // According to SQLCipher documentation running some SELECT is the only way to
  // check for key validity
  if (use_encryption_key) {
    set_encryption_key(db);
  }
  sqlite3_exec(
      db, "SELECT COUNT(*) FROM sqlite_master;", nullptr, nullptr, &err_msg);
  sqlite3_close(db);
  return !err_msg;
}

void validate_encryption() {
  std::string temp_encrypted_db_path =
      SQLiteQueryExecutor::sqliteFilePath + "_temp_encrypted";

  bool temp_encrypted_exists = file_exists(temp_encrypted_db_path);
  bool default_location_exists =
      file_exists(SQLiteQueryExecutor::sqliteFilePath);

  if (temp_encrypted_exists && default_location_exists) {
    Logger::log(
        "Previous encryption attempt failed. Repeating encryption process from "
        "the beginning.");
    attempt_delete_file(
        temp_encrypted_db_path,
        "Failed to delete corrupted encrypted database.");
  } else if (temp_encrypted_exists && !default_location_exists) {
    Logger::log(
        "Moving temporary encrypted database to default location failed in "
        "previous encryption attempt. Repeating rename step.");
    attempt_rename_file(
        temp_encrypted_db_path,
        SQLiteQueryExecutor::sqliteFilePath,
        "Failed to move encrypted database to default location.");
    return;
  } else if (!default_location_exists) {
    Logger::log(
        "Database not present yet. It will be created encrypted under default "
        "path.");
    return;
  }

  sqlite3 *db;
  if (is_database_queryable(db, true)) {
    Logger::log(
        "Database exists under default path and it is correctly encrypted.");
    return;
  }

  if (!is_database_queryable(db, false)) {
    Logger::log(
        "Database exists but it is encrypted with key that was lost. "
        "Attempting database deletion. New encrypted one will be created.");
    attempt_delete_file(
        SQLiteQueryExecutor::sqliteFilePath.c_str(),
        "Failed to delete database encrypted with lost key.");
    return;
  } else {
    Logger::log(
        "Database exists but it is not encrypted. Attempting encryption "
        "process.");
  }
  sqlite3_open(SQLiteQueryExecutor::sqliteFilePath.c_str(), &db);

  std::string createEncryptedCopySQL = "ATTACH DATABASE '" +
      temp_encrypted_db_path +
      "' AS encrypted_comm "
      "KEY \"x'" +
      SQLiteQueryExecutor::encryptionKey +
      "'\";"
      "SELECT sqlcipher_export('encrypted_comm');"
      "DETACH DATABASE encrypted_comm;";

  char *encryption_error;
  sqlite3_exec(
      db, createEncryptedCopySQL.c_str(), nullptr, nullptr, &encryption_error);

  if (encryption_error) {
    throw std::system_error(
        ECANCELED,
        std::generic_category(),
        "Failed to create encrypted copy of the original database.");
  }
  sqlite3_close(db);

  attempt_delete_file(
      SQLiteQueryExecutor::sqliteFilePath,
      "Failed to delete unencrypted database.");
  attempt_rename_file(
      temp_encrypted_db_path,
      SQLiteQueryExecutor::sqliteFilePath,
      "Failed to move encrypted database to default location.");
  Logger::log("Encryption completed successfully.");
}

typedef bool ShouldBeInTransaction;
typedef std::function<bool(sqlite3 *)> MigrateFunction;
typedef std::pair<MigrateFunction, ShouldBeInTransaction> SQLiteMigration;
std::vector<std::pair<uint, SQLiteMigration>> migrations{
    {{1, {create_drafts_table, true}},
     {2, {rename_threadID_to_key, true}},
     {4, {create_persist_account_table, true}},
     {5, {create_persist_sessions_table, true}},
     {15, {create_media_table, true}},
     {16, {drop_messages_table, true}},
     {17, {recreate_messages_table, true}},
     {18, {create_messages_idx_thread_time, true}},
     {19, {create_media_idx_container, true}},
     {20, {create_threads_table, true}},
     {21, {update_threadID_for_pending_threads_in_drafts, true}},
     {22, {enable_write_ahead_logging_mode, false}},
     {23, {create_metadata_table, true}},
     {24, {add_not_null_constraint_to_drafts, true}},
     {25, {add_not_null_constraint_to_metadata, true}},
     {26, {add_avatar_column_to_threads_table, true}},
     {27, {add_pinned_count_column_to_threads, true}},
     {28, {create_message_store_threads_table, true}}}};

enum class MigrationResult { SUCCESS, FAILURE, NOT_APPLIED };

MigrationResult applyMigrationWithTransaction(
    sqlite3 *db,
    const MigrateFunction &migrate,
    int index) {
  sqlite3_exec(db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);
  auto db_version = get_database_version(db);
  if (index <= db_version) {
    sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
    return MigrationResult::NOT_APPLIED;
  }
  auto rc = migrate(db);
  if (!rc) {
    sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
    return MigrationResult::FAILURE;
  }
  auto database_version_set = set_database_version(db, index);
  if (!database_version_set) {
    sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
    return MigrationResult::FAILURE;
  }
  sqlite3_exec(db, "END TRANSACTION;", nullptr, nullptr, nullptr);
  return MigrationResult::SUCCESS;
}

MigrationResult applyMigrationWithoutTransaction(
    sqlite3 *db,
    const MigrateFunction &migrate,
    int index) {
  auto db_version = get_database_version(db);
  if (index <= db_version) {
    return MigrationResult::NOT_APPLIED;
  }
  auto rc = migrate(db);
  if (!rc) {
    return MigrationResult::FAILURE;
  }
  sqlite3_exec(db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);
  auto inner_db_version = get_database_version(db);
  if (index <= inner_db_version) {
    sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
    return MigrationResult::NOT_APPLIED;
  }
  auto database_version_set = set_database_version(db, index);
  if (!database_version_set) {
    sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
    return MigrationResult::FAILURE;
  }
  sqlite3_exec(db, "END TRANSACTION;", nullptr, nullptr, nullptr);
  return MigrationResult::SUCCESS;
}

bool set_up_database(sqlite3 *db) {
  auto write_ahead_enabled = enable_write_ahead_logging_mode(db);
  if (!write_ahead_enabled) {
    return false;
  }

  sqlite3_exec(db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);
  auto db_version = get_database_version(db);
  auto latest_version = migrations.back().first;
  if (db_version == latest_version) {
    sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
    return true;
  }
  if (db_version != 0 || !create_schema(db) ||
      !set_database_version(db, latest_version)) {
    sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
    return false;
  }
  sqlite3_exec(db, "END TRANSACTION;", nullptr, nullptr, nullptr);
  return true;
}

void SQLiteQueryExecutor::migrate() {
  validate_encryption();

  sqlite3 *db;
  sqlite3_open(SQLiteQueryExecutor::sqliteFilePath.c_str(), &db);
  on_database_open(db);

  std::stringstream db_path;
  db_path << "db path: " << SQLiteQueryExecutor::sqliteFilePath.c_str()
          << std::endl;
  Logger::log(db_path.str());

  auto db_version = get_database_version(db);
  std::stringstream version_msg;
  version_msg << "db version: " << db_version << std::endl;
  Logger::log(version_msg.str());

  if (db_version == 0) {
    auto db_created = set_up_database(db);
    if (!db_created) {
      sqlite3_close(db);
      Logger::log("Database structure creation error.");
      throw std::runtime_error("Database structure creation error");
    }
    Logger::log("Database structure created.");

    sqlite3_close(db);
    return;
  }

  for (const auto &[idx, migration] : migrations) {
    const auto &[applyMigration, shouldBeInTransaction] = migration;

    MigrationResult migrationResult;
    if (shouldBeInTransaction) {
      migrationResult = applyMigrationWithTransaction(db, applyMigration, idx);
    } else {
      migrationResult =
          applyMigrationWithoutTransaction(db, applyMigration, idx);
    }

    if (migrationResult == MigrationResult::NOT_APPLIED) {
      continue;
    }

    std::stringstream migration_msg;
    if (migrationResult == MigrationResult::FAILURE) {
      migration_msg << "migration " << idx << " failed." << std::endl;
      Logger::log(migration_msg.str());
      sqlite3_close(db);
      throw std::runtime_error(migration_msg.str());
    }
    if (migrationResult == MigrationResult::SUCCESS) {
      migration_msg << "migration " << idx << " succeeded." << std::endl;
      Logger::log(migration_msg.str());
    }
  }

  sqlite3_close(db);
}

void SQLiteQueryExecutor::assign_encryption_key() {
  CommSecureStore commSecureStore{};
  std::string encryptionKey = comm::crypto::Tools::generateRandomHexString(
      SQLiteQueryExecutor::sqlcipherEncryptionKeySize);
  commSecureStore.set(
      SQLiteQueryExecutor::secureStoreEncryptionKeyID, encryptionKey);
  SQLiteQueryExecutor::encryptionKey = encryptionKey;
}

auto &SQLiteQueryExecutor::getStorage() {
  static auto storage = make_storage(
      SQLiteQueryExecutor::sqliteFilePath,
      make_index("messages_idx_thread_time", &Message::thread, &Message::time),
      make_index("media_idx_container", &Media::container),
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
          make_column("id", &OlmPersistAccount::id, unique(), primary_key()),
          make_column("account_data", &OlmPersistAccount::account_data)),
      make_table(
          "olm_persist_sessions",
          make_column(
              "target_user_id",
              &OlmPersistSession::target_user_id,
              unique(),
              primary_key()),
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
          make_column("replies_count", &Thread::replies_count),
          make_column("avatar", &Thread::avatar),
          make_column("pinned_count", &Thread::pinned_count, default_value(0))),
      make_table(
          "metadata",
          make_column("name", &Metadata::name, unique(), primary_key()),
          make_column("data", &Metadata::data)),
      make_table(
          "message_store_threads",
          make_column("id", &MessageStoreThread::id, unique(), primary_key()),
          make_column("start_reached", &MessageStoreThread::start_reached),
          make_column(
              "last_navigated_to", &MessageStoreThread::last_navigated_to),
          make_column("last_pruned", &MessageStoreThread::last_pruned)));
  storage.on_open = on_database_open;
  return storage;
}

void SQLiteQueryExecutor::initialize(std::string &databasePath) {
  std::call_once(SQLiteQueryExecutor::initialized, [&databasePath]() {
    SQLiteQueryExecutor::sqliteFilePath = databasePath;
    CommSecureStore commSecureStore{};
    folly::Optional<std::string> maybeEncryptionKey =
        commSecureStore.get(SQLiteQueryExecutor::secureStoreEncryptionKeyID);

    if (file_exists(databasePath) && maybeEncryptionKey) {
      SQLiteQueryExecutor::encryptionKey = maybeEncryptionKey.value();
      return;
    }
    SQLiteQueryExecutor::assign_encryption_key();
  });
}

SQLiteQueryExecutor::SQLiteQueryExecutor() {
  SQLiteQueryExecutor::migrate();
}

std::string SQLiteQueryExecutor::getDraft(std::string key) const {
  std::unique_ptr<Draft> draft =
      SQLiteQueryExecutor::getStorage().get_pointer<Draft>(key);
  return (draft == nullptr) ? "" : draft->text;
}

std::unique_ptr<Thread>
SQLiteQueryExecutor::getThread(std::string threadID) const {
  return SQLiteQueryExecutor::getStorage().get_pointer<Thread>(threadID);
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

std::vector<std::pair<Message, std::vector<Media>>>
SQLiteQueryExecutor::getAllMessages() const {

  auto rows = SQLiteQueryExecutor::getStorage().select(
      columns(
          &Message::id,
          &Message::local_id,
          &Message::thread,
          &Message::user,
          &Message::type,
          &Message::future_type,
          &Message::content,
          &Message::time,
          &Media::id,
          &Media::container,
          &Media::thread,
          &Media::uri,
          &Media::type,
          &Media::extras),
      left_join<Media>(on(c(&Message::id) == &Media::container)),
      order_by(&Message::id));

  std::vector<std::pair<Message, std::vector<Media>>> allMessages;
  allMessages.reserve(rows.size());

  std::string prev_msg_idx{};
  for (auto &row : rows) {
    auto msg_id = std::get<0>(row);
    if (msg_id == prev_msg_idx) {
      allMessages.back().second.push_back(Media{
          std::get<8>(row),
          std::move(std::get<9>(row)),
          std::move(std::get<10>(row)),
          std::move(std::get<11>(row)),
          std::move(std::get<12>(row)),
          std::move(std::get<13>(row)),
      });
    } else {
      std::vector<Media> mediaForMsg;
      if (!std::get<8>(row).empty()) {
        mediaForMsg.push_back(Media{
            std::get<8>(row),
            std::move(std::get<9>(row)),
            std::move(std::get<10>(row)),
            std::move(std::get<11>(row)),
            std::move(std::get<12>(row)),
            std::move(std::get<13>(row)),
        });
      }
      allMessages.push_back(std::make_pair(
          Message{
              msg_id,
              std::move(std::get<1>(row)),
              std::move(std::get<2>(row)),
              std::move(std::get<3>(row)),
              std::get<4>(row),
              std::move(std::get<5>(row)),
              std::move(std::get<6>(row)),
              std::get<7>(row)},
          mediaForMsg));

      prev_msg_idx = msg_id;
    }
  }

  return allMessages;
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

void SQLiteQueryExecutor::removeMediaForMessage(std::string msg_id) const {
  SQLiteQueryExecutor::getStorage().remove_all<Media>(
      where(c(&Media::container) == msg_id));
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

void SQLiteQueryExecutor::replaceMessageStoreThreads(
    const std::vector<MessageStoreThread> &threads) const {
  for (auto &thread : threads) {
    SQLiteQueryExecutor::getStorage().replace(thread);
  }
}

void SQLiteQueryExecutor::removeAllMessageStoreThreads() const {
  SQLiteQueryExecutor::getStorage().remove_all<MessageStoreThread>();
}

void SQLiteQueryExecutor::removeMessageStoreThreads(
    const std::vector<std::string> &ids) const {
  SQLiteQueryExecutor::getStorage().remove_all<MessageStoreThread>(
      where(in(&MessageStoreThread::id, ids)));
}

std::vector<MessageStoreThread>
SQLiteQueryExecutor::getAllMessageStoreThreads() const {
  return SQLiteQueryExecutor::getStorage().get_all<MessageStoreThread>();
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

void SQLiteQueryExecutor::setNotifyToken(std::string token) const {
  this->setMetadata("notify_token", token);
}

void SQLiteQueryExecutor::clearNotifyToken() const {
  this->clearMetadata("notify_token");
}

void SQLiteQueryExecutor::setCurrentUserID(std::string userID) const {
  this->setMetadata("current_user_id", userID);
}

std::string SQLiteQueryExecutor::getCurrentUserID() const {
  return this->getMetadata("current_user_id");
}

void SQLiteQueryExecutor::setDeviceID(std::string deviceID) const {
  this->setMetadata("device_id", deviceID);
};

std::string SQLiteQueryExecutor::getDeviceID() const {
  return this->getMetadata("device_id");
};

void SQLiteQueryExecutor::setMetadata(std::string entry_name, std::string data)
    const {
  Metadata entry{
      entry_name,
      data,
  };
  SQLiteQueryExecutor::getStorage().replace(entry);
}

void SQLiteQueryExecutor::clearMetadata(std::string entry_name) const {
  SQLiteQueryExecutor::getStorage().remove<Metadata>(entry_name);
}

std::string SQLiteQueryExecutor::getMetadata(std::string entry_name) const {
  std::unique_ptr<Metadata> entry =
      SQLiteQueryExecutor::getStorage().get_pointer<Metadata>(entry_name);
  return (entry == nullptr) ? "" : entry->data;
}

void SQLiteQueryExecutor::clearSensitiveData() {
  if (file_exists(SQLiteQueryExecutor::sqliteFilePath) &&
      std::remove(SQLiteQueryExecutor::sqliteFilePath.c_str())) {
    std::ostringstream errorStream;
    errorStream << "Failed to delete database file. Details: "
                << strerror(errno);
    throw std::system_error(errno, std::generic_category(), errorStream.str());
  }
  SQLiteQueryExecutor::assign_encryption_key();
  SQLiteQueryExecutor::migrate();
}

} // namespace comm
