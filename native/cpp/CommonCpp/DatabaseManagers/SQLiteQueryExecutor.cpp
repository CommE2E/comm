#include "SQLiteQueryExecutor.h"
#include "Logger.h"

#include "entities/EntityQueryHelpers.h"
#include "entities/Metadata.h"
#include "entities/UserInfo.h"
#include <fstream>
#include <iostream>
#include <thread>

#ifndef EMSCRIPTEN
#include "CommSecureStore.h"
#include "PlatformSpecificTools.h"
#endif

#define ACCOUNT_ID 1

namespace comm {

using namespace sqlite_orm;

std::string SQLiteQueryExecutor::sqliteFilePath;
std::string SQLiteQueryExecutor::encryptionKey;
std::once_flag SQLiteQueryExecutor::initialized;
int SQLiteQueryExecutor::sqlcipherEncryptionKeySize = 64;
std::string SQLiteQueryExecutor::secureStoreEncryptionKeyID =
    "comm.encryptionKey";
sqlite3 *SQLiteQueryExecutor::dbConnection = nullptr;

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

bool create_reports_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS reports ("
      "	 id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 report TEXT NOT NULL"
      ");";
  return create_table(db, query, "reports");
}

bool create_persist_storage_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS persist_storage ("
      "  key TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  item TEXT NOT NULL"
      ");";
  return create_table(db, query, "persist_storage");
}

bool recreate_message_store_threads_table(sqlite3 *db) {
  char *errMsg = 0;

  // 1. Create table without `last_navigated_to` or `last_pruned`.
  std::string create_new_table_query =
      "CREATE TABLE IF NOT EXISTS temp_message_store_threads ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  start_reached INTEGER NOT NULL"
      ");";

  if (sqlite3_exec(db, create_new_table_query.c_str(), NULL, NULL, &errMsg) !=
      SQLITE_OK) {
    Logger::log(
        "Error creating temp_message_store_threads: " + std::string{errMsg});
    sqlite3_free(errMsg);
    return false;
  }

  // 2. Dump data from existing `message_store_threads` table into temp table.
  std::string copy_data_query =
      "INSERT INTO temp_message_store_threads (id, start_reached)"
      "SELECT id, start_reached FROM message_store_threads;";

  if (sqlite3_exec(db, copy_data_query.c_str(), NULL, NULL, &errMsg) !=
      SQLITE_OK) {
    Logger::log(
        "Error dumping data from existing message_store_threads to "
        "temp_message_store_threads: " +
        std::string{errMsg});
    sqlite3_free(errMsg);
    return false;
  }

  // 3. Drop the existing `message_store_threads` table.
  std::string drop_old_table_query = "DROP TABLE message_store_threads;";

  if (sqlite3_exec(db, drop_old_table_query.c_str(), NULL, NULL, &errMsg) !=
      SQLITE_OK) {
    Logger::log(
        "Error dropping message_store_threads table: " + std::string{errMsg});
    sqlite3_free(errMsg);
    return false;
  }

  // 4. Rename the temp table back to `message_store_threads`.
  std::string rename_table_query =
      "ALTER TABLE temp_message_store_threads RENAME TO message_store_threads;";

  if (sqlite3_exec(db, rename_table_query.c_str(), NULL, NULL, &errMsg) !=
      SQLITE_OK) {
    Logger::log(
        "Error renaming temp_message_store_threads to message_store_threads: " +
        std::string{errMsg});
    sqlite3_free(errMsg);
    return false;
  }

  return true;
}

bool create_users_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS users ("
      "	 id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 user_info TEXT NOT NULL"
      ");";
  return create_table(db, query, "users");
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
      "	 start_reached INTEGER NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS reports ("
      "	 id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 report TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS persist_storage ("
      "  key TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  item TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS users ("
      "	 id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 user_info TEXT NOT NULL"
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

void set_encryption_key(
    sqlite3 *db,
    const std::string &encryptionKey = SQLiteQueryExecutor::encryptionKey) {
  std::string set_encryption_key_query =
      "PRAGMA key = \"x'" + encryptionKey + "'\";";

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

// We don't want to run `PRAGMA key = ...;`
// on main web database. The context is here:
// https://linear.app/comm/issue/ENG-6398/issues-with-sqlcipher-on-web
void default_on_db_open_callback(sqlite3 *db) {
#ifndef EMSCRIPTEN
  set_encryption_key(db);
#endif
  trace_queries(db);
}

// This is a temporary solution. In future we want to keep
// a separate table for blob hashes. Tracked on Linear:
// https://linear.app/comm/issue/ENG-6261/introduce-blob-hash-table
std::string blob_hash_from_blob_service_uri(const std::string &media_uri) {
  static const std::string blob_service_prefix = "comm-blob-service://";
  return media_uri.substr(blob_service_prefix.size());
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

bool is_database_queryable(
    sqlite3 *db,
    bool use_encryption_key,
    const std::string &path = SQLiteQueryExecutor::sqliteFilePath,
    const std::string &encryptionKey = SQLiteQueryExecutor::encryptionKey) {
  char *err_msg;
  sqlite3_open(path.c_str(), &db);
  // According to SQLCipher documentation running some SELECT is the only way to
  // check for key validity
  if (use_encryption_key) {
    set_encryption_key(db, encryptionKey);
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
std::vector<std::pair<unsigned int, SQLiteMigration>> migrations{
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
     {28, {create_message_store_threads_table, true}},
     {29, {create_reports_table, true}},
     {30, {create_persist_storage_table, true}},
     {31, {recreate_message_store_threads_table, true}},
     {32, {create_users_table, true}}}};

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
#ifndef EMSCRIPTEN
  auto write_ahead_enabled = enable_write_ahead_logging_mode(db);
  if (!write_ahead_enabled) {
    return false;
  }
#endif

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

auto getEncryptedStorageAtPath(
    const std::string &databasePath,
    std::function<void(sqlite3 *)> on_open_callback =
        default_on_db_open_callback) {
  auto storage = make_storage(
      databasePath,
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
          make_column("start_reached", &MessageStoreThread::start_reached)),
      make_table(
          "reports",
          make_column("id", &Report::id, unique(), primary_key()),
          make_column("report", &Report::report)),
      make_table(
          "persist_storage",
          make_column("key", &PersistItem::key, unique(), primary_key()),
          make_column("item", &PersistItem::item)),
      make_table(
          "users",
          make_column("id", &UserInfo::id, unique(), primary_key()),
          make_column("user_info", &UserInfo::user_info))

  );
  storage.on_open = on_open_callback;
  return storage;
}

void SQLiteQueryExecutor::migrate() {
// We don't want to run `PRAGMA key = ...;`
// on main web database. The context is here:
// https://linear.app/comm/issue/ENG-6398/issues-with-sqlcipher-on-web
#ifndef EMSCRIPTEN
  validate_encryption();
#endif

  sqlite3 *db;
  sqlite3_open(SQLiteQueryExecutor::sqliteFilePath.c_str(), &db);
  default_on_db_open_callback(db);

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

auto &SQLiteQueryExecutor::getStorage() {
  static auto storage =
      getEncryptedStorageAtPath(SQLiteQueryExecutor::sqliteFilePath);
  return storage;
}

SQLiteQueryExecutor::SQLiteQueryExecutor() {
  SQLiteQueryExecutor::migrate();
}

SQLiteQueryExecutor::SQLiteQueryExecutor(std::string sqliteFilePath) {
  SQLiteQueryExecutor::sqliteFilePath = sqliteFilePath;
  SQLiteQueryExecutor::migrate();
}

sqlite3 *SQLiteQueryExecutor::getConnection() {
  if (!SQLiteQueryExecutor::dbConnection) {
    int connectResult = sqlite3_open(
        SQLiteQueryExecutor::sqliteFilePath.c_str(),
        &SQLiteQueryExecutor::dbConnection);
    if (connectResult != SQLITE_OK) {
      std::stringstream error_message;
      error_message << "Failed to open database connection. Details: "
                    << sqlite3_errstr(connectResult) << std::endl;
      throw std::runtime_error(error_message.str());
    }
    default_on_db_open_callback(SQLiteQueryExecutor::dbConnection);
  }
  return SQLiteQueryExecutor::dbConnection;
}

void SQLiteQueryExecutor::closeConnection() {
  if (!SQLiteQueryExecutor::dbConnection) {
    return;
  }
  sqlite3_close(SQLiteQueryExecutor::dbConnection);
  SQLiteQueryExecutor::dbConnection = nullptr;
}

SQLiteQueryExecutor::~SQLiteQueryExecutor() {
  SQLiteQueryExecutor::closeConnection();
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
  static std::string getAllDraftsSQL = "SELECT * FROM drafts;";
  auto allDrafts = getAllEntities<Draft>(
      SQLiteQueryExecutor::getConnection(), getAllDraftsSQL);
  return allDrafts;
}

void SQLiteQueryExecutor::removeAllDrafts() const {
  SQLiteQueryExecutor::getStorage().remove_all<Draft>();
}

void SQLiteQueryExecutor::removeAllMessages() const {
  SQLiteQueryExecutor::getStorage().remove_all<Message>();
}

std::vector<std::pair<Message, std::vector<Media>>>
SQLiteQueryExecutor::getAllMessages() const {
  static std::string getAllMessagesSQL =
      "SELECT * FROM messages LEFT JOIN media ON messages.id = media.container "
      "ORDER BY messages.id;";
  sqlite3_stmt *preparedSQL =
      getPreparedSQL(SQLiteQueryExecutor::getConnection(), getAllMessagesSQL);

  int stepResult;
  std::string prevMsgIdx{};
  std::vector<std::pair<Message, std::vector<Media>>> allMessages;

  while ((stepResult = sqlite3_step(preparedSQL)) == SQLITE_ROW) {
    Message message = Message::fromSQLResult(preparedSQL, 0);
    if (message.id == prevMsgIdx) {
      allMessages.back().second.push_back(Media::fromSQLResult(preparedSQL, 8));
    } else {
      prevMsgIdx = message.id;
      std::vector<Media> mediaForMsg;
      if (sqlite3_column_type(preparedSQL, 8) != SQLITE_NULL) {
        mediaForMsg.push_back(Media::fromSQLResult(preparedSQL, 8));
      }
      allMessages.push_back(std::make_pair(std::move(message), mediaForMsg));
    }
  }

  finalizePreparedStatement(
      preparedSQL, stepResult, "Failed to retrieve all messages.");
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
  static std::string getAllMessageStoreThreadsSQL =
      "SELECT * FROM message_store_threads;";
  auto allMessageStoreThreads = getAllEntities<MessageStoreThread>(
      SQLiteQueryExecutor::getConnection(), getAllMessageStoreThreadsSQL);
  return allMessageStoreThreads;
}

std::vector<Thread> SQLiteQueryExecutor::getAllThreads() const {
  static std::string getAllThreadsSQL = "SELECT * FROM threads;";
  auto allThreads = getAllEntities<Thread>(
      SQLiteQueryExecutor::getConnection(), getAllThreadsSQL);
  return allThreads;
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

void SQLiteQueryExecutor::replaceReport(const Report &report) const {
  SQLiteQueryExecutor::getStorage().replace(report);
}

void SQLiteQueryExecutor::removeAllReports() const {
  SQLiteQueryExecutor::getStorage().remove_all<Report>();
}

void SQLiteQueryExecutor::removeReports(
    const std::vector<std::string> &ids) const {
  SQLiteQueryExecutor::getStorage().remove_all<Report>(
      where(in(&Report::id, ids)));
}

std::vector<Report> SQLiteQueryExecutor::getAllReports() const {
  static std::string getAllReportsSQL = "SELECT * FROM reports;";
  auto allReports = getAllEntities<Report>(
      SQLiteQueryExecutor::getConnection(), getAllReportsSQL);
  return allReports;
}

void SQLiteQueryExecutor::setPersistStorageItem(
    std::string key,
    std::string item) const {
  PersistItem entry{
      key,
      item,
  };
  SQLiteQueryExecutor::getStorage().replace(entry);
}

void SQLiteQueryExecutor::removePersistStorageItem(std::string key) const {
  SQLiteQueryExecutor::getStorage().remove<PersistItem>(key);
}

std::string SQLiteQueryExecutor::getPersistStorageItem(std::string key) const {
  std::unique_ptr<PersistItem> entry =
      SQLiteQueryExecutor::getStorage().get_pointer<PersistItem>(key);
  return (entry == nullptr) ? "" : entry->item;
}

void SQLiteQueryExecutor::replaceUser(const UserInfo &user_info) const {
  SQLiteQueryExecutor::getStorage().replace(user_info);
}

void SQLiteQueryExecutor::removeAllUsers() const {
  SQLiteQueryExecutor::getStorage().remove_all<UserInfo>();
}

void SQLiteQueryExecutor::removeUsers(
    const std::vector<std::string> &ids) const {
  SQLiteQueryExecutor::getStorage().remove_all<UserInfo>(
      where(in(&UserInfo::id, ids)));
}

std::vector<UserInfo> SQLiteQueryExecutor::getAllUsers() const {
  static std::string getAllUsersSQL = "SELECT * FROM users;";
  auto allUsers = getAllEntities<UserInfo>(
      SQLiteQueryExecutor::getConnection(), getAllUsersSQL);
  return allUsers;
}

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
  static std::string getAllOlmPersistSessionsSQL =
      "SELECT * FROM olm_persist_sessions;";
  return getAllEntities<OlmPersistSession>(
      SQLiteQueryExecutor::getConnection(), getAllOlmPersistSessionsSQL);
}

std::optional<std::string>
SQLiteQueryExecutor::getOlmPersistAccountData() const {
  static std::string getAllOlmPersistAccountSQL =
      "SELECT * FROM olm_persist_account;";
  std::vector<OlmPersistAccount> result = getAllEntities<OlmPersistAccount>(
      SQLiteQueryExecutor::getConnection(), getAllOlmPersistAccountSQL);
  if (result.size() > 1) {
    throw std::system_error(
        ECANCELED,
        std::generic_category(),
        "Multiple records found for the olm_persist_account table");
  }
  return (result.size() == 0)
      ? std::nullopt
      : std::optional<std::string>(result[0].account_data);
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

#ifdef EMSCRIPTEN
std::vector<WebThread> SQLiteQueryExecutor::getAllThreadsWeb() const {
  auto threads = this->getAllThreads();
  std::vector<WebThread> webThreads;
  webThreads.reserve(threads.size());
  for (const auto &thread : threads) {
    webThreads.emplace_back(thread);
  }
  return webThreads;
};

void SQLiteQueryExecutor::replaceThreadWeb(const WebThread &thread) const {
  SQLiteQueryExecutor::getStorage().replace(thread.toThread());
};
#else
void SQLiteQueryExecutor::clearSensitiveData() {
  SQLiteQueryExecutor::closeConnection();
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

void SQLiteQueryExecutor::initialize(std::string &databasePath) {
  std::call_once(SQLiteQueryExecutor::initialized, [&databasePath]() {
    SQLiteQueryExecutor::sqliteFilePath = databasePath;
    folly::Optional<std::string> maybeEncryptionKey =
        CommSecureStore::get(SQLiteQueryExecutor::secureStoreEncryptionKeyID);

    if (file_exists(databasePath) && maybeEncryptionKey) {
      SQLiteQueryExecutor::encryptionKey = maybeEncryptionKey.value();
      return;
    }
    SQLiteQueryExecutor::assign_encryption_key();
  });
}

void SQLiteQueryExecutor::createMainCompaction(std::string backupID) const {
  std::string finalBackupPath =
      PlatformSpecificTools::getBackupFilePath(backupID, false);
  std::string finalAttachmentsPath =
      PlatformSpecificTools::getBackupFilePath(backupID, true);

  std::string tempBackupPath = finalBackupPath + "_tmp";
  std::string tempAttachmentsPath = finalAttachmentsPath + "_tmp";

  if (file_exists(tempBackupPath)) {
    Logger::log(
        "Attempting to delete temporary backup file from previous backup "
        "attempt.");
    attempt_delete_file(
        tempBackupPath,
        "Failed to delete temporary backup file from previous backup attempt.");
  }

  if (file_exists(tempAttachmentsPath)) {
    Logger::log(
        "Attempting to delete temporary attachments file from previous backup "
        "attempt.");
    attempt_delete_file(
        tempAttachmentsPath,
        "Failed to delete temporary attachments file from previous backup "
        "attempt.");
  }

  auto backupStorage = getEncryptedStorageAtPath(
      tempBackupPath, [](sqlite3 *db) { set_encryption_key(db); });
  auto backupObj =
      SQLiteQueryExecutor::getStorage().make_backup_to(backupStorage);
  int backupResult = backupObj.step(-1);

  if (backupResult == SQLITE_BUSY || backupResult == SQLITE_LOCKED) {
    throw std::runtime_error(
        "Programmer error. Database in transaction during backup attempt.");
  } else if (backupResult != SQLITE_DONE) {
    std::stringstream error_message;
    error_message << "Failed to create database backup. Details: "
                  << sqlite3_errstr(backupResult);
    throw std::runtime_error(error_message.str());
  }
  backupStorage.vacuum();

  attempt_rename_file(
      tempBackupPath,
      finalBackupPath,
      "Failed to rename complete temporary backup file to final backup file.");

  std::ofstream tempAttachmentsFile(tempAttachmentsPath);
  if (!tempAttachmentsFile.is_open()) {
    throw std::runtime_error(
        "Unable to create attachments file for backup id: " + backupID);
  }

  auto blobServiceURIRows = SQLiteQueryExecutor::getStorage().select(
      columns(&Media::uri), where(like(&Media::uri, "comm-blob-service://%")));

  for (const auto &blobServiceURIRow : blobServiceURIRows) {
    std::string blobServiceURI = std::get<0>(blobServiceURIRow);
    std::string blobHash = blob_hash_from_blob_service_uri(blobServiceURI);
    tempAttachmentsFile << blobHash << "\n";
  }
  tempAttachmentsFile.close();

  attempt_rename_file(
      tempAttachmentsPath,
      finalAttachmentsPath,
      "Failed to rename complete temporary attachments file to final "
      "attachments file.");
}

void SQLiteQueryExecutor::assign_encryption_key() {
  std::string encryptionKey = comm::crypto::Tools::generateRandomHexString(
      SQLiteQueryExecutor::sqlcipherEncryptionKeySize);
  CommSecureStore::set(
      SQLiteQueryExecutor::secureStoreEncryptionKeyID, encryptionKey);
  SQLiteQueryExecutor::encryptionKey = encryptionKey;
}
#endif

void SQLiteQueryExecutor::restoreFromMainCompaction(
    std::string mainCompactionPath,
    std::string mainCompactionEncryptionKey) const {

  if (!file_exists(mainCompactionPath)) {
    throw std::runtime_error("Restore attempt but backup file does not exist.");
  }

  sqlite3 *backup_db;
  if (!is_database_queryable(
          backup_db, true, mainCompactionPath, mainCompactionEncryptionKey)) {
    throw std::runtime_error("Backup file or encryption key corrupted.");
  }

// We don't want to run `PRAGMA key = ...;`
// on main web database. The context is here:
// https://linear.app/comm/issue/ENG-6398/issues-with-sqlcipher-on-web
#ifdef EMSCRIPTEN
  std::string plaintextBackupPath = mainCompactionPath + "_plaintext";
  if (file_exists(plaintextBackupPath)) {
    attempt_delete_file(
        plaintextBackupPath,
        "Failed to delete plaintext backup file from previous backup attempt.");
  }

  std::string plaintextMigrationDBQuery = "PRAGMA key = \"x'" +
      mainCompactionEncryptionKey +
      "'\";"
      "ATTACH DATABASE '" +
      plaintextBackupPath +
      "' AS plaintext KEY '';"
      "SELECT sqlcipher_export('plaintext');"
      "DETACH DATABASE plaintext;";

  sqlite3_open(mainCompactionPath.c_str(), &backup_db);

  char *plaintextMigrationErr;
  sqlite3_exec(
      backup_db,
      plaintextMigrationDBQuery.c_str(),
      nullptr,
      nullptr,
      &plaintextMigrationErr);
  sqlite3_close(backup_db);

  if (plaintextMigrationErr) {
    std::stringstream error_message;
    error_message << "Failed to migrate backup SQLCipher file to plaintext "
                     "SQLite file. Details"
                  << plaintextMigrationErr << std::endl;
    std::string error_message_str = error_message.str();
    sqlite3_free(plaintextMigrationErr);

    throw std::runtime_error(error_message_str);
  }
  auto backupStorage = getEncryptedStorageAtPath(plaintextBackupPath);
#else
  auto backupStorage = getEncryptedStorageAtPath(
      mainCompactionPath, [mainCompactionEncryptionKey](sqlite3 *db) {
        set_encryption_key(db, mainCompactionEncryptionKey);
      });
#endif

  auto backupObject =
      SQLiteQueryExecutor::getStorage().make_backup_from(backupStorage);
  int backupResult = backupObject.step(-1);

  if (backupResult == SQLITE_BUSY || backupResult == SQLITE_LOCKED) {
    throw std::runtime_error(
        "Programmer error. Database in transaction during restore attempt.");
  } else if (backupResult != SQLITE_DONE) {
    std::stringstream error_message;
    error_message << "Failed to restore database from backup. Details: "
                  << sqlite3_errstr(backupResult);
    throw std::runtime_error(error_message.str());
  }

#ifdef EMSCRIPTEN
  attempt_delete_file(
      plaintextBackupPath,
      "Failed to delete plaintext compaction file after successful restore.");
#endif

  attempt_delete_file(
      mainCompactionPath,
      "Failed to delete main compaction file after successful restore.");
}

} // namespace comm
