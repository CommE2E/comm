#include "SQLiteQueryExecutor.h"
#include "Logger.h"

#include "entities/CommunityInfo.h"
#include "entities/EntityQueryHelpers.h"
#include "entities/KeyserverInfo.h"
#include "entities/Metadata.h"
#include "entities/SyncedMetadataEntry.h"
#include "entities/UserInfo.h"
#include <fstream>
#include <iostream>
#include <thread>

#ifndef EMSCRIPTEN
#include "CommSecureStore.h"
#include "PlatformSpecificTools.h"
#include "StaffUtils.h"
#endif

const int CONTENT_ACCOUNT_ID = 1;
const int NOTIFS_ACCOUNT_ID = 2;

namespace comm {

std::string SQLiteQueryExecutor::sqliteFilePath;
std::string SQLiteQueryExecutor::encryptionKey;
std::once_flag SQLiteQueryExecutor::initialized;
int SQLiteQueryExecutor::sqlcipherEncryptionKeySize = 64;
// Should match constant defined in `native_rust_library/src/constants.rs`
std::string SQLiteQueryExecutor::secureStoreEncryptionKeyID =
    "comm.encryptionKey";
int SQLiteQueryExecutor::backupLogsEncryptionKeySize = 32;
std::string SQLiteQueryExecutor::secureStoreBackupLogsEncryptionKeyID =
    "comm.backupLogsEncryptionKey";
std::string SQLiteQueryExecutor::backupLogsEncryptionKey;

#ifndef EMSCRIPTEN
NativeSQLiteConnectionManager SQLiteQueryExecutor::connectionManager;
#else
SQLiteConnectionManager SQLiteQueryExecutor::connectionManager;
#endif

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

bool create_keyservers_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS keyservers ("
      "	 id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 keyserver_info TEXT NOT NULL"
      ");";
  return create_table(db, query, "keyservers");
}

bool enable_rollback_journal_mode(sqlite3 *db) {
  char *error;
  sqlite3_exec(db, "PRAGMA journal_mode=DELETE;", nullptr, nullptr, &error);

  if (!error) {
    return true;
  }

  std::stringstream error_message;
  error_message << "Error disabling write-ahead logging mode: " << error;
  Logger::log(error_message.str());
  sqlite3_free(error);
  return false;
}

bool create_communities_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS communities ("
      "   id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "   community_info TEXT NOT NULL"
      ");";
  return create_table(db, query, "communities");
}

bool create_messages_to_device_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS messages_to_device ("
      "	 message_id TEXT NOT NULL,"
      "	 device_id TEXT NOT NULL,"
      "	 user_id TEXT NOT NULL,"
      "	 timestamp BIGINT NOT NULL,"
      "	 plaintext TEXT NOT NULL,"
      "	 ciphertext TEXT NOT NULL,"
      "	 PRIMARY KEY (message_id, device_id)"
      ");"

      "CREATE INDEX IF NOT EXISTS messages_to_device_idx_id_timestamp"
      "  ON messages_to_device (device_id, timestamp);";

  return create_table(db, query, "messages_to_device");
}

bool create_synced_metadata_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS synced_metadata ("
      "	 name TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 data TEXT NOT NULL"
      ");";
  return create_table(db, query, "synced_metadata");
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

      "CREATE TABLE IF NOT EXISTS keyservers ("
      "	 id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 keyserver_info TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS communities ("
      "   id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "   community_info TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS messages_to_device ("
      "	 message_id TEXT NOT NULL,"
      "	 device_id TEXT NOT NULL,"
      "	 user_id TEXT NOT NULL,"
      "	 timestamp BIGINT NOT NULL,"
      "	 plaintext TEXT NOT NULL,"
      "	 ciphertext TEXT NOT NULL,"
      "	 PRIMARY KEY (message_id, device_id)"
      ");"

      "CREATE TABLE IF NOT EXISTS synced_metadata ("
      "	 name TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 data TEXT NOT NULL"
      ");"

      "CREATE INDEX IF NOT EXISTS media_idx_container"
      "  ON media (container);"

      "CREATE INDEX IF NOT EXISTS messages_idx_thread_time"
      "  ON messages (thread, time);"

      "CREATE INDEX IF NOT EXISTS messages_to_device_idx_id_timestamp"
      "  ON messages_to_device (device_id, timestamp);",

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

// We don't want to run `PRAGMA key = ...;`
// on main web database. The context is here:
// https://linear.app/comm/issue/ENG-6398/issues-with-sqlcipher-on-web
void default_on_db_open_callback(sqlite3 *db) {
#ifndef EMSCRIPTEN
  set_encryption_key(db);
#endif
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
     {32, {create_users_table, true}},
     {33, {create_keyservers_table, true}},
     {34, {enable_rollback_journal_mode, false}},
     {35, {create_communities_table, true}},
     {36, {create_messages_to_device_table, true}},
     {37, {create_synced_metadata_table, true}}}};

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

SQLiteQueryExecutor::SQLiteQueryExecutor() {
  SQLiteQueryExecutor::migrate();
#ifndef EMSCRIPTEN
  std::string currentBackupID = this->getMetadata("backupID");
  if (!StaffUtils::isStaffRelease() || !currentBackupID.size()) {
    return;
  }
  SQLiteQueryExecutor::connectionManager.setLogsMonitoring(true);
#endif
}

SQLiteQueryExecutor::SQLiteQueryExecutor(std::string sqliteFilePath) {
  SQLiteQueryExecutor::sqliteFilePath = sqliteFilePath;
  SQLiteQueryExecutor::migrate();
}

sqlite3 *SQLiteQueryExecutor::getConnection() {
  if (SQLiteQueryExecutor::connectionManager.getConnection()) {
    return SQLiteQueryExecutor::connectionManager.getConnection();
  }
  SQLiteQueryExecutor::connectionManager.initializeConnection(
      SQLiteQueryExecutor::sqliteFilePath, default_on_db_open_callback);
  return SQLiteQueryExecutor::connectionManager.getConnection();
}

void SQLiteQueryExecutor::closeConnection() {
  SQLiteQueryExecutor::connectionManager.closeConnection();
}

SQLiteQueryExecutor::~SQLiteQueryExecutor() {
  SQLiteQueryExecutor::closeConnection();
}

std::string SQLiteQueryExecutor::getDraft(std::string key) const {
  static std::string getDraftByPrimaryKeySQL =
      "SELECT * "
      "FROM drafts "
      "WHERE key = ?;";
  std::unique_ptr<Draft> draft = getEntityByPrimaryKey<Draft>(
      SQLiteQueryExecutor::getConnection(), getDraftByPrimaryKeySQL, key);
  return (draft == nullptr) ? "" : draft->text;
}

std::unique_ptr<Thread>
SQLiteQueryExecutor::getThread(std::string threadID) const {
  static std::string getThreadByPrimaryKeySQL =
      "SELECT * "
      "FROM threads "
      "WHERE id = ?;";
  return getEntityByPrimaryKey<Thread>(
      SQLiteQueryExecutor::getConnection(), getThreadByPrimaryKeySQL, threadID);
}

void SQLiteQueryExecutor::updateDraft(std::string key, std::string text) const {
  static std::string replaceDraftSQL =
      "REPLACE INTO drafts (key, text) "
      "VALUES (?, ?);";
  Draft draft = {key, text};
  replaceEntity<Draft>(
      SQLiteQueryExecutor::getConnection(), replaceDraftSQL, draft);
}

bool SQLiteQueryExecutor::moveDraft(std::string oldKey, std::string newKey)
    const {
  std::string draftText = this->getDraft(oldKey);
  if (!draftText.size()) {
    return false;
  }
  static std::string rekeyDraftSQL =
      "UPDATE OR REPLACE drafts "
      "SET key = ? "
      "WHERE key = ?;";
  rekeyAllEntities(
      SQLiteQueryExecutor::getConnection(), rekeyDraftSQL, oldKey, newKey);
  return true;
}

std::vector<Draft> SQLiteQueryExecutor::getAllDrafts() const {
  static std::string getAllDraftsSQL =
      "SELECT * "
      "FROM drafts;";
  return getAllEntities<Draft>(
      SQLiteQueryExecutor::getConnection(), getAllDraftsSQL);
}

void SQLiteQueryExecutor::removeAllDrafts() const {
  static std::string removeAllDraftsSQL = "DELETE FROM drafts;";
  removeAllEntities(SQLiteQueryExecutor::getConnection(), removeAllDraftsSQL);
}

void SQLiteQueryExecutor::removeDrafts(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeDraftsByKeysSQLStream;
  removeDraftsByKeysSQLStream << "DELETE FROM drafts "
                                 "WHERE key IN "
                              << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeDraftsByKeysSQLStream.str(),
      ids);
}

void SQLiteQueryExecutor::removeAllMessages() const {
  static std::string removeAllMessagesSQL = "DELETE FROM messages;";
  removeAllEntities(SQLiteQueryExecutor::getConnection(), removeAllMessagesSQL);
}

std::vector<std::pair<Message, std::vector<Media>>>
SQLiteQueryExecutor::getAllMessages() const {
  static std::string getAllMessagesSQL =
      "SELECT * "
      "FROM messages "
      "LEFT JOIN media "
      "   ON messages.id = media.container "
      "ORDER BY messages.id;";
  SQLiteStatementWrapper preparedSQL(
      SQLiteQueryExecutor::getConnection(),
      getAllMessagesSQL,
      "Failed to retrieve all messages.");

  std::string prevMsgIdx{};
  std::vector<std::pair<Message, std::vector<Media>>> allMessages;

  for (int stepResult = sqlite3_step(preparedSQL); stepResult == SQLITE_ROW;
       stepResult = sqlite3_step(preparedSQL)) {
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
  return allMessages;
}

void SQLiteQueryExecutor::removeMessages(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeMessagesByKeysSQLStream;
  removeMessagesByKeysSQLStream << "DELETE FROM messages "
                                   "WHERE id IN "
                                << getSQLStatementArray(ids.size()) << ";";
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeMessagesByKeysSQLStream.str(),
      ids);
}

void SQLiteQueryExecutor::removeMessagesForThreads(
    const std::vector<std::string> &threadIDs) const {
  if (!threadIDs.size()) {
    return;
  }

  std::stringstream removeMessagesByKeysSQLStream;
  removeMessagesByKeysSQLStream << "DELETE FROM messages "
                                   "WHERE thread IN "
                                << getSQLStatementArray(threadIDs.size())
                                << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeMessagesByKeysSQLStream.str(),
      threadIDs);
}

void SQLiteQueryExecutor::replaceMessage(const Message &message) const {
  static std::string replaceMessageSQL =
      "REPLACE INTO messages "
      "(id, local_id, thread, user, type, future_type, content, time) "
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?);";

  replaceEntity<Message>(
      SQLiteQueryExecutor::getConnection(), replaceMessageSQL, message);
}

void SQLiteQueryExecutor::rekeyMessage(std::string from, std::string to) const {
  static std::string rekeyMessageSQL =
      "UPDATE OR REPLACE messages "
      "SET id = ? "
      "WHERE id = ?";
  rekeyAllEntities(
      SQLiteQueryExecutor::getConnection(), rekeyMessageSQL, from, to);
}

void SQLiteQueryExecutor::removeAllMedia() const {
  static std::string removeAllMediaSQL = "DELETE FROM media;";
  removeAllEntities(SQLiteQueryExecutor::getConnection(), removeAllMediaSQL);
}

void SQLiteQueryExecutor::removeMediaForMessages(
    const std::vector<std::string> &msg_ids) const {
  if (!msg_ids.size()) {
    return;
  }

  std::stringstream removeMediaByKeysSQLStream;
  removeMediaByKeysSQLStream << "DELETE FROM media "
                                "WHERE container IN "
                             << getSQLStatementArray(msg_ids.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeMediaByKeysSQLStream.str(),
      msg_ids);
}

void SQLiteQueryExecutor::removeMediaForMessage(std::string msg_id) const {
  static std::string removeMediaByKeySQL =
      "DELETE FROM media "
      "WHERE container IN (?);";
  std::vector<std::string> keys = {msg_id};
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(), removeMediaByKeySQL, keys);
}

void SQLiteQueryExecutor::removeMediaForThreads(
    const std::vector<std::string> &thread_ids) const {
  if (!thread_ids.size()) {
    return;
  }

  std::stringstream removeMediaByKeysSQLStream;
  removeMediaByKeysSQLStream << "DELETE FROM media "
                                "WHERE thread IN "
                             << getSQLStatementArray(thread_ids.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeMediaByKeysSQLStream.str(),
      thread_ids);
}

void SQLiteQueryExecutor::replaceMedia(const Media &media) const {
  static std::string replaceMediaSQL =
      "REPLACE INTO media "
      "(id, container, thread, uri, type, extras) "
      "VALUES (?, ?, ?, ?, ?, ?)";
  replaceEntity<Media>(
      SQLiteQueryExecutor::getConnection(), replaceMediaSQL, media);
}

void SQLiteQueryExecutor::rekeyMediaContainers(std::string from, std::string to)
    const {
  static std::string rekeyMediaContainersSQL =
      "UPDATE media SET container = ? WHERE container = ?;";
  rekeyAllEntities(
      SQLiteQueryExecutor::getConnection(), rekeyMediaContainersSQL, from, to);
}

void SQLiteQueryExecutor::replaceMessageStoreThreads(
    const std::vector<MessageStoreThread> &threads) const {
  static std::string replaceMessageStoreThreadSQL =
      "REPLACE INTO message_store_threads "
      "(id, start_reached) "
      "VALUES (?, ?);";

  for (auto &thread : threads) {
    replaceEntity<MessageStoreThread>(
        SQLiteQueryExecutor::getConnection(),
        replaceMessageStoreThreadSQL,
        thread);
  }
}

void SQLiteQueryExecutor::removeAllMessageStoreThreads() const {
  static std::string removeAllMessageStoreThreadsSQL =
      "DELETE FROM message_store_threads;";
  removeAllEntities(
      SQLiteQueryExecutor::getConnection(), removeAllMessageStoreThreadsSQL);
}

void SQLiteQueryExecutor::removeMessageStoreThreads(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeMessageStoreThreadsByKeysSQLStream;
  removeMessageStoreThreadsByKeysSQLStream
      << "DELETE FROM message_store_threads "
         "WHERE id IN "
      << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeMessageStoreThreadsByKeysSQLStream.str(),
      ids);
}

std::vector<MessageStoreThread>
SQLiteQueryExecutor::getAllMessageStoreThreads() const {
  static std::string getAllMessageStoreThreadsSQL =
      "SELECT * "
      "FROM message_store_threads;";
  return getAllEntities<MessageStoreThread>(
      SQLiteQueryExecutor::getConnection(), getAllMessageStoreThreadsSQL);
}

std::vector<Thread> SQLiteQueryExecutor::getAllThreads() const {
  static std::string getAllThreadsSQL =
      "SELECT * "
      "FROM threads;";
  return getAllEntities<Thread>(
      SQLiteQueryExecutor::getConnection(), getAllThreadsSQL);
};

void SQLiteQueryExecutor::removeThreads(std::vector<std::string> ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeThreadsByKeysSQLStream;
  removeThreadsByKeysSQLStream << "DELETE FROM threads "
                                  "WHERE id IN "
                               << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeThreadsByKeysSQLStream.str(),
      ids);
};

void SQLiteQueryExecutor::replaceThread(const Thread &thread) const {
  static std::string replaceThreadSQL =
      "REPLACE INTO threads ("
      " id, type, name, description, color, creation_time, parent_thread_id,"
      " containing_thread_id, community, members, roles, current_user,"
      " source_message_id, replies_count, avatar, pinned_count) "
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";

  replaceEntity<Thread>(
      SQLiteQueryExecutor::getConnection(), replaceThreadSQL, thread);
};

void SQLiteQueryExecutor::removeAllThreads() const {
  static std::string removeAllThreadsSQL = "DELETE FROM threads;";
  removeAllEntities(SQLiteQueryExecutor::getConnection(), removeAllThreadsSQL);
};

void SQLiteQueryExecutor::replaceReport(const Report &report) const {
  static std::string replaceReportSQL =
      "REPLACE INTO reports (id, report) "
      "VALUES (?, ?);";

  replaceEntity<Report>(
      SQLiteQueryExecutor::getConnection(), replaceReportSQL, report);
}

void SQLiteQueryExecutor::removeAllReports() const {
  static std::string removeAllReportsSQL = "DELETE FROM reports;";
  removeAllEntities(SQLiteQueryExecutor::getConnection(), removeAllReportsSQL);
}

void SQLiteQueryExecutor::removeReports(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeReportsByKeysSQLStream;
  removeReportsByKeysSQLStream << "DELETE FROM reports "
                                  "WHERE id IN "
                               << getSQLStatementArray(ids.size()) << ";";
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeReportsByKeysSQLStream.str(),
      ids);
}

std::vector<Report> SQLiteQueryExecutor::getAllReports() const {
  static std::string getAllReportsSQL =
      "SELECT * "
      "FROM reports;";
  return getAllEntities<Report>(
      SQLiteQueryExecutor::getConnection(), getAllReportsSQL);
}

void SQLiteQueryExecutor::setPersistStorageItem(
    std::string key,
    std::string item) const {
  static std::string replacePersistStorageItemSQL =
      "REPLACE INTO persist_storage (key, item) "
      "VALUES (?, ?);";
  PersistItem entry{
      key,
      item,
  };
  replaceEntity<PersistItem>(
      SQLiteQueryExecutor::getConnection(),
      replacePersistStorageItemSQL,
      entry);
}

void SQLiteQueryExecutor::removePersistStorageItem(std::string key) const {
  static std::string removePersistStorageItemByKeySQL =
      "DELETE FROM persist_storage "
      "WHERE key IN (?);";
  std::vector<std::string> keys = {key};
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removePersistStorageItemByKeySQL,
      keys);
}

std::string SQLiteQueryExecutor::getPersistStorageItem(std::string key) const {
  static std::string getPersistStorageItemByPrimaryKeySQL =
      "SELECT * "
      "FROM persist_storage "
      "WHERE key = ?;";
  std::unique_ptr<PersistItem> entry = getEntityByPrimaryKey<PersistItem>(
      SQLiteQueryExecutor::getConnection(),
      getPersistStorageItemByPrimaryKeySQL,
      key);
  return (entry == nullptr) ? "" : entry->item;
}

void SQLiteQueryExecutor::replaceUser(const UserInfo &user_info) const {
  static std::string replaceUserSQL =
      "REPLACE INTO users (id, user_info) "
      "VALUES (?, ?);";
  replaceEntity<UserInfo>(
      SQLiteQueryExecutor::getConnection(), replaceUserSQL, user_info);
}

void SQLiteQueryExecutor::removeAllUsers() const {
  static std::string removeAllUsersSQL = "DELETE FROM users;";
  removeAllEntities(SQLiteQueryExecutor::getConnection(), removeAllUsersSQL);
}

void SQLiteQueryExecutor::removeUsers(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeUsersByKeysSQLStream;
  removeUsersByKeysSQLStream << "DELETE FROM users "
                                "WHERE id IN "
                             << getSQLStatementArray(ids.size()) << ";";
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeUsersByKeysSQLStream.str(),
      ids);
}

void SQLiteQueryExecutor::replaceKeyserver(
    const KeyserverInfo &keyserver_info) const {
  static std::string replaceKeyserverSQL =
      "REPLACE INTO keyservers (id, keyserver_info) "
      "VALUES (?, ?);";
  replaceEntity<KeyserverInfo>(
      SQLiteQueryExecutor::getConnection(),
      replaceKeyserverSQL,
      keyserver_info);
}

void SQLiteQueryExecutor::removeAllKeyservers() const {
  static std::string removeAllKeyserversSQL = "DELETE FROM keyservers;";
  removeAllEntities(
      SQLiteQueryExecutor::getConnection(), removeAllKeyserversSQL);
}

void SQLiteQueryExecutor::removeKeyservers(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeKeyserversByKeysSQLStream;
  removeKeyserversByKeysSQLStream << "DELETE FROM keyservers "
                                     "WHERE id IN "
                                  << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeKeyserversByKeysSQLStream.str(),
      ids);
}

std::vector<KeyserverInfo> SQLiteQueryExecutor::getAllKeyservers() const {
  static std::string getAllKeyserversSQL =
      "SELECT * "
      "FROM keyservers;";
  return getAllEntities<KeyserverInfo>(
      SQLiteQueryExecutor::getConnection(), getAllKeyserversSQL);
}

std::vector<UserInfo> SQLiteQueryExecutor::getAllUsers() const {
  static std::string getAllUsersSQL =
      "SELECT * "
      "FROM users;";
  return getAllEntities<UserInfo>(
      SQLiteQueryExecutor::getConnection(), getAllUsersSQL);
}

void SQLiteQueryExecutor::replaceCommunity(
    const CommunityInfo &community_info) const {
  static std::string replaceCommunitySQL =
      "REPLACE INTO communities (id, community_info) "
      "VALUES (?, ?);";
  replaceEntity<CommunityInfo>(
      SQLiteQueryExecutor::getConnection(),
      replaceCommunitySQL,
      community_info);
}

void SQLiteQueryExecutor::removeAllCommunities() const {
  static std::string removeAllCommunitiesSQL = "DELETE FROM communities;";
  removeAllEntities(
      SQLiteQueryExecutor::getConnection(), removeAllCommunitiesSQL);
}

void SQLiteQueryExecutor::removeCommunities(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeCommunitiesByKeysSQLStream;
  removeCommunitiesByKeysSQLStream << "DELETE FROM communities "
                                      "WHERE id IN "
                                   << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeCommunitiesByKeysSQLStream.str(),
      ids);
}

std::vector<CommunityInfo> SQLiteQueryExecutor::getAllCommunities() const {
  static std::string getAllCommunitiesSQL =
      "SELECT * "
      "FROM communities;";
  return getAllEntities<CommunityInfo>(
      SQLiteQueryExecutor::getConnection(), getAllCommunitiesSQL);
}

void SQLiteQueryExecutor::replaceSyncedMetadataEntry(
    const SyncedMetadataEntry &synced_metadata_entry) const {
  static std::string replaceSyncedMetadataEntrySQL =
      "REPLACE INTO synced_metadata (name, data) "
      "VALUES (?, ?);";
  replaceEntity<SyncedMetadataEntry>(
      SQLiteQueryExecutor::getConnection(),
      replaceSyncedMetadataEntrySQL,
      synced_metadata_entry);
}

void SQLiteQueryExecutor::removeAllSyncedMetadata() const {
  static std::string removeAllSyncedMetadataSQL =
      "DELETE FROM synced_metadata;";
  removeAllEntities(
      SQLiteQueryExecutor::getConnection(), removeAllSyncedMetadataSQL);
}

void SQLiteQueryExecutor::removeSyncedMetadata(
    const std::vector<std::string> &names) const {
  if (!names.size()) {
    return;
  }

  std::stringstream removeSyncedMetadataByNamesSQLStream;
  removeSyncedMetadataByNamesSQLStream << "DELETE FROM synced_metadata "
                                          "WHERE name IN "
                                       << getSQLStatementArray(names.size())
                                       << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeSyncedMetadataByNamesSQLStream.str(),
      names);
}

std::vector<SyncedMetadataEntry>
SQLiteQueryExecutor::getAllSyncedMetadata() const {
  static std::string getAllSyncedMetadataSQL =
      "SELECT * "
      "FROM synced_metadata;";
  return getAllEntities<SyncedMetadataEntry>(
      SQLiteQueryExecutor::getConnection(), getAllSyncedMetadataSQL);
}

void SQLiteQueryExecutor::beginTransaction() const {
  executeQuery(SQLiteQueryExecutor::getConnection(), "BEGIN TRANSACTION;");
}

void SQLiteQueryExecutor::commitTransaction() const {
  executeQuery(SQLiteQueryExecutor::getConnection(), "COMMIT;");
}

void SQLiteQueryExecutor::rollbackTransaction() const {
  executeQuery(SQLiteQueryExecutor::getConnection(), "ROLLBACK;");
}

int SQLiteQueryExecutor::getContentAccountID() const {
  return CONTENT_ACCOUNT_ID;
}

int SQLiteQueryExecutor::getNotifsAccountID() const {
  return NOTIFS_ACCOUNT_ID;
}

std::vector<OlmPersistSession>
SQLiteQueryExecutor::getOlmPersistSessionsData() const {
  static std::string getAllOlmPersistSessionsSQL =
      "SELECT * "
      "FROM olm_persist_sessions;";
  return getAllEntities<OlmPersistSession>(
      SQLiteQueryExecutor::getConnection(), getAllOlmPersistSessionsSQL);
}

std::optional<std::string>
SQLiteQueryExecutor::getOlmPersistAccountData(int accountID) const {
  static std::string getOlmPersistAccountSQL =
      "SELECT * "
      "FROM olm_persist_account "
      "WHERE id = ?;";
  std::unique_ptr<OlmPersistAccount> result =
      getEntityByIntegerPrimaryKey<OlmPersistAccount>(
          SQLiteQueryExecutor::getConnection(),
          getOlmPersistAccountSQL,
          accountID);
  if (result == nullptr) {
    return std::nullopt;
  }
  return result->account_data;
}

void SQLiteQueryExecutor::storeOlmPersistAccount(
    int accountID,
    const std::string &accountData) const {
  static std::string replaceOlmPersistAccountSQL =
      "REPLACE INTO olm_persist_account (id, account_data) "
      "VALUES (?, ?);";

  OlmPersistAccount persistAccount = {accountID, accountData};

  replaceEntity<OlmPersistAccount>(
      SQLiteQueryExecutor::getConnection(),
      replaceOlmPersistAccountSQL,
      persistAccount);
}

void SQLiteQueryExecutor::storeOlmPersistSession(
    const OlmPersistSession &session) const {
  static std::string replaceOlmPersistSessionSQL =
      "REPLACE INTO olm_persist_sessions (target_user_id, session_data) "
      "VALUES (?, ?);";

  replaceEntity<OlmPersistSession>(
      SQLiteQueryExecutor::getConnection(),
      replaceOlmPersistSessionSQL,
      session);
}

void SQLiteQueryExecutor::storeOlmPersistData(
    int accountID,
    crypto::Persist persist) const {

  if (accountID != CONTENT_ACCOUNT_ID && persist.sessions.size() > 0) {
    throw std::runtime_error(
        "Attempt to store notifications sessions in SQLite. Notifications "
        "sessions must be stored in storage shared with NSE.");
  }

  std::string accountData =
      std::string(persist.account.begin(), persist.account.end());
  this->storeOlmPersistAccount(accountID, accountData);

  for (auto it = persist.sessions.begin(); it != persist.sessions.end(); it++) {
    OlmPersistSession persistSession = {
        it->first, std::string(it->second.begin(), it->second.end())};
    this->storeOlmPersistSession(persistSession);
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
  std::string replaceMetadataSQL =
      "REPLACE INTO metadata (name, data) "
      "VALUES (?, ?);";
  Metadata entry{
      entry_name,
      data,
  };
  replaceEntity<Metadata>(
      SQLiteQueryExecutor::getConnection(), replaceMetadataSQL, entry);
}

void SQLiteQueryExecutor::clearMetadata(std::string entry_name) const {
  static std::string removeMetadataByKeySQL =
      "DELETE FROM metadata "
      "WHERE name IN (?);";
  std::vector<std::string> keys = {entry_name};
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(), removeMetadataByKeySQL, keys);
}

std::string SQLiteQueryExecutor::getMetadata(std::string entry_name) const {
  std::string getMetadataByPrimaryKeySQL =
      "SELECT * "
      "FROM metadata "
      "WHERE name = ?;";
  std::unique_ptr<Metadata> entry = getEntityByPrimaryKey<Metadata>(
      SQLiteQueryExecutor::getConnection(),
      getMetadataByPrimaryKeySQL,
      entry_name);
  return (entry == nullptr) ? "" : entry->data;
}

void SQLiteQueryExecutor::addMessagesToDevice(
    const std::vector<ClientMessageToDevice> &messages) const {
  static std::string addMessageToDevice =
      "REPLACE INTO messages_to_device ("
      " message_id, device_id, user_id, timestamp, plaintext, ciphertext) "
      "VALUES (?, ?, ?, ?, ?, ?);";

  for (const ClientMessageToDevice &clientMessage : messages) {
    MessageToDevice message = clientMessage.toMessageToDevice();
    replaceEntity<MessageToDevice>(
        SQLiteQueryExecutor::getConnection(), addMessageToDevice, message);
  }
}

std::vector<ClientMessageToDevice>
SQLiteQueryExecutor::getAllMessagesToDevice(const std::string &deviceID) const {
  std::string query =
      "SELECT * FROM messages_to_device "
      "WHERE device_id = ? "
      "ORDER BY timestamp;";

  SQLiteStatementWrapper preparedSQL(
      SQLiteQueryExecutor::getConnection(),
      query,
      "Failed to get all messages to device");

  sqlite3_bind_text(preparedSQL, 1, deviceID.c_str(), -1, SQLITE_TRANSIENT);

  std::vector<ClientMessageToDevice> messages;
  for (int stepResult = sqlite3_step(preparedSQL); stepResult == SQLITE_ROW;
       stepResult = sqlite3_step(preparedSQL)) {
    messages.emplace_back(
        ClientMessageToDevice(MessageToDevice::fromSQLResult(preparedSQL, 0)));
  }

  return messages;
}

void SQLiteQueryExecutor::removeMessagesToDeviceOlderThan(
    const ClientMessageToDevice &lastConfirmedMessageClient) const {
  static std::string query =
      "DELETE FROM messages_to_device "
      "WHERE timestamp <= ? AND device_id IN (?);";

  MessageToDevice lastConfirmedMessage =
      lastConfirmedMessageClient.toMessageToDevice();

  comm::SQLiteStatementWrapper preparedSQL(
      SQLiteQueryExecutor::getConnection(),
      query,
      "Failed to remove messages to device");

  sqlite3_bind_int64(preparedSQL, 1, lastConfirmedMessage.timestamp);
  sqlite3_bind_text(
      preparedSQL,
      2,
      lastConfirmedMessage.device_id.c_str(),
      -1,
      SQLITE_TRANSIENT);

  int result = sqlite3_step(preparedSQL);
  if (result != SQLITE_DONE) {
    throw std::runtime_error(
        "Failed to execute removeMessagesToDeviceOlderThan statement: " +
        std::string(sqlite3_errmsg(SQLiteQueryExecutor::getConnection())));
  }
}

void SQLiteQueryExecutor::removeAllMessagesForDevice(
    const std::string &deviceID) const {
  static std::string removeMessagesSQL =
      "DELETE FROM messages_to_device "
      "WHERE device_id IN (?);";
  std::vector<std::string> keys = {deviceID};
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(), removeMessagesSQL, keys);
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
  this->replaceThread(thread.toThread());
};

std::vector<MessageWithMedias> SQLiteQueryExecutor::getAllMessagesWeb() const {
  auto allMessages = this->getAllMessages();

  std::vector<MessageWithMedias> allMessageWithMedias;
  for (auto &messageWitMedia : allMessages) {
    allMessageWithMedias.push_back(
        {std::move(messageWitMedia.first), messageWitMedia.second});
  }

  return allMessageWithMedias;
}

void SQLiteQueryExecutor::replaceMessageWeb(const WebMessage &message) const {
  this->replaceMessage(message.toMessage());
};

NullableString
SQLiteQueryExecutor::getOlmPersistAccountDataWeb(int accountID) const {
  std::optional<std::string> accountData =
      this->getOlmPersistAccountData(accountID);
  if (!accountData.has_value()) {
    return NullableString();
  }
  return std::make_unique<std::string>(accountData.value());
}
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
  SQLiteQueryExecutor::generateFreshEncryptionKey();
  SQLiteQueryExecutor::migrate();
}

void SQLiteQueryExecutor::initialize(std::string &databasePath) {
  std::call_once(SQLiteQueryExecutor::initialized, [&databasePath]() {
    SQLiteQueryExecutor::sqliteFilePath = databasePath;
    folly::Optional<std::string> maybeEncryptionKey =
        CommSecureStore::get(SQLiteQueryExecutor::secureStoreEncryptionKeyID);
    folly::Optional<std::string> maybeBackupLogsEncryptionKey =
        CommSecureStore::get(
            SQLiteQueryExecutor::secureStoreBackupLogsEncryptionKeyID);

    if (file_exists(databasePath) && maybeEncryptionKey &&
        maybeBackupLogsEncryptionKey) {
      SQLiteQueryExecutor::encryptionKey = maybeEncryptionKey.value();
      SQLiteQueryExecutor::backupLogsEncryptionKey =
          maybeBackupLogsEncryptionKey.value();
      return;
    } else if (file_exists(databasePath) && maybeEncryptionKey) {
      SQLiteQueryExecutor::encryptionKey = maybeEncryptionKey.value();
      SQLiteQueryExecutor::generateFreshBackupLogsEncryptionKey();
      return;
    }
    SQLiteQueryExecutor::generateFreshEncryptionKey();
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

  sqlite3 *backupDB;
  sqlite3_open(tempBackupPath.c_str(), &backupDB);
  set_encryption_key(backupDB);

  sqlite3_backup *backupObj = sqlite3_backup_init(
      backupDB, "main", SQLiteQueryExecutor::getConnection(), "main");
  if (!backupObj) {
    std::stringstream error_message;
    error_message << "Failed to init backup for main compaction. Details: "
                  << sqlite3_errmsg(backupDB) << std::endl;
    sqlite3_close(backupDB);
    throw std::runtime_error(error_message.str());
  }

  int backupResult = sqlite3_backup_step(backupObj, -1);
  sqlite3_backup_finish(backupObj);
  if (backupResult == SQLITE_BUSY || backupResult == SQLITE_LOCKED) {
    sqlite3_close(backupDB);
    throw std::runtime_error(
        "Programmer error. Database in transaction during backup attempt.");
  } else if (backupResult != SQLITE_DONE) {
    sqlite3_close(backupDB);
    std::stringstream error_message;
    error_message << "Failed to create database backup. Details: "
                  << sqlite3_errstr(backupResult);
    throw std::runtime_error(error_message.str());
  }

  std::string removeDeviceSpecificDataSQL =
      "DELETE FROM olm_persist_account;"
      "DELETE FROM olm_persist_sessions;"
      "DELETE FROM metadata;"
      "DELETE FROM messages_to_device;";
  executeQuery(backupDB, removeDeviceSpecificDataSQL);
  executeQuery(backupDB, "VACUUM;");
  sqlite3_close(backupDB);

  attempt_rename_file(
      tempBackupPath,
      finalBackupPath,
      "Failed to rename complete temporary backup file to final backup file.");

  std::ofstream tempAttachmentsFile(tempAttachmentsPath);
  if (!tempAttachmentsFile.is_open()) {
    throw std::runtime_error(
        "Unable to create attachments file for backup id: " + backupID);
  }

  std::string getAllBlobServiceMediaSQL =
      "SELECT * FROM media WHERE uri LIKE 'comm-blob-service://%';";
  std::vector<Media> blobServiceMedia = getAllEntities<Media>(
      SQLiteQueryExecutor::getConnection(), getAllBlobServiceMediaSQL);

  for (const auto &media : blobServiceMedia) {
    std::string blobServiceURI = media.uri;
    std::string blobHash = blob_hash_from_blob_service_uri(blobServiceURI);
    tempAttachmentsFile << blobHash << "\n";
  }
  tempAttachmentsFile.close();

  attempt_rename_file(
      tempAttachmentsPath,
      finalAttachmentsPath,
      "Failed to rename complete temporary attachments file to final "
      "attachments file.");

  this->setMetadata("backupID", backupID);
  this->clearMetadata("logID");
  if (StaffUtils::isStaffRelease()) {
    SQLiteQueryExecutor::connectionManager.setLogsMonitoring(true);
  }
}

void SQLiteQueryExecutor::generateFreshEncryptionKey() {
  std::string encryptionKey = comm::crypto::Tools::generateRandomHexString(
      SQLiteQueryExecutor::sqlcipherEncryptionKeySize);
  CommSecureStore::set(
      SQLiteQueryExecutor::secureStoreEncryptionKeyID, encryptionKey);
  SQLiteQueryExecutor::encryptionKey = encryptionKey;
  SQLiteQueryExecutor::generateFreshBackupLogsEncryptionKey();
}

void SQLiteQueryExecutor::generateFreshBackupLogsEncryptionKey() {
  std::string backupLogsEncryptionKey =
      comm::crypto::Tools::generateRandomHexString(
          SQLiteQueryExecutor::backupLogsEncryptionKeySize);
  CommSecureStore::set(
      SQLiteQueryExecutor::secureStoreBackupLogsEncryptionKeyID,
      backupLogsEncryptionKey);
  SQLiteQueryExecutor::backupLogsEncryptionKey = backupLogsEncryptionKey;
}

void SQLiteQueryExecutor::captureBackupLogs() const {
  std::string backupID = this->getMetadata("backupID");
  if (!backupID.size()) {
    return;
  }

  std::string logID = this->getMetadata("logID");
  if (!logID.size()) {
    logID = "1";
  }

  bool newLogCreated = SQLiteQueryExecutor::connectionManager.captureLogs(
      backupID, logID, SQLiteQueryExecutor::backupLogsEncryptionKey);
  if (!newLogCreated) {
    return;
  }
  this->setMetadata("logID", std::to_string(std::stoi(logID) + 1));
}
#endif

void SQLiteQueryExecutor::restoreFromMainCompaction(
    std::string mainCompactionPath,
    std::string mainCompactionEncryptionKey) const {

  if (!file_exists(mainCompactionPath)) {
    throw std::runtime_error("Restore attempt but backup file does not exist.");
  }

  sqlite3 *backupDB;
  if (!is_database_queryable(
          backupDB, true, mainCompactionPath, mainCompactionEncryptionKey)) {
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

  sqlite3_open(mainCompactionPath.c_str(), &backupDB);

  char *plaintextMigrationErr;
  sqlite3_exec(
      backupDB,
      plaintextMigrationDBQuery.c_str(),
      nullptr,
      nullptr,
      &plaintextMigrationErr);
  sqlite3_close(backupDB);

  if (plaintextMigrationErr) {
    std::stringstream error_message;
    error_message << "Failed to migrate backup SQLCipher file to plaintext "
                     "SQLite file. Details"
                  << plaintextMigrationErr << std::endl;
    std::string error_message_str = error_message.str();
    sqlite3_free(plaintextMigrationErr);

    throw std::runtime_error(error_message_str);
  }

  sqlite3_open(plaintextBackupPath.c_str(), &backupDB);
#else
  sqlite3_open(mainCompactionPath.c_str(), &backupDB);
  set_encryption_key(backupDB, mainCompactionEncryptionKey);
#endif

  sqlite3_backup *backupObj = sqlite3_backup_init(
      SQLiteQueryExecutor::getConnection(), "main", backupDB, "main");
  if (!backupObj) {
    std::stringstream error_message;
    error_message << "Failed to init backup for main compaction. Details: "
                  << sqlite3_errmsg(SQLiteQueryExecutor::getConnection())
                  << std::endl;
    sqlite3_close(backupDB);
    throw std::runtime_error(error_message.str());
  }

  int backupResult = sqlite3_backup_step(backupObj, -1);
  sqlite3_backup_finish(backupObj);
  sqlite3_close(backupDB);
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

void SQLiteQueryExecutor::restoreFromBackupLog(
    const std::vector<std::uint8_t> &backupLog) const {
  SQLiteQueryExecutor::connectionManager.restoreFromBackupLog(backupLog);
}

} // namespace comm
