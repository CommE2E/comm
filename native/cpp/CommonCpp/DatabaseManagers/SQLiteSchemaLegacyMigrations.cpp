#include "SQLiteSchema.h"

#include "../NativeModules/PersistentStorageUtilities/MessageOperationsUtilities/MessageTypeEnum.h"
#include "Logger.h"

#include <sqlite3.h>
#include <fstream>
#include <sstream>
#include <string>

namespace comm {

bool create_drafts_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS drafts (threadID TEXT UNIQUE PRIMARY KEY, "
      "text TEXT);";
  return SQLiteSchema::createTable(db, query, "drafts");
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
  return SQLiteSchema::createTable(db, query, "olm_persist_account");
}

bool create_persist_sessions_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS olm_persist_sessions("
      "target_user_id TEXT UNIQUE PRIMARY KEY NOT NULL, "
      "session_data TEXT NOT NULL);";
  return SQLiteSchema::createTable(db, query, "olm_persist_sessions");
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
  return SQLiteSchema::createTable(db, query, "messages");
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

bool create_messages_idx_target_message_type_time(sqlite3 *db) {
  char *error;
  sqlite3_exec(
      db,
      "ALTER TABLE messages "
      "  ADD COLUMN target_message TEXT "
      "  AS (IIF( "
      "    JSON_VALID(content), "
      "    JSON_EXTRACT(content, '$.targetMessageID'), "
      "    NULL "
      "  )); "
      "CREATE INDEX IF NOT EXISTS messages_idx_target_message_type_time "
      "  ON messages (target_message, type, time);",
      nullptr,
      nullptr,
      &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream
      << "Error creating (target_message, type, time) index on messages table: "
      << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool update_messages_idx_target_message_type_time(sqlite3 *db) {
  char *error;
  int sidebarSourceTypeInt = static_cast<int>(MessageType::SIDEBAR_SOURCE);
  std::string sidebarSourceType = std::to_string(sidebarSourceTypeInt);

  auto query =
      "DROP INDEX IF EXISTS messages_idx_target_message_type_time;"
      "ALTER TABLE messages DROP COLUMN target_message;"
      "ALTER TABLE messages "
      "  ADD COLUMN target_message TEXT "
      "  AS (IIF("
      "    JSON_VALID(content),"
      "    COALESCE("
      "      JSON_EXTRACT(content, '$.targetMessageID'),"
      "      IIF("
      "        type = " +
      sidebarSourceType +
      "        , JSON_EXTRACT(content, '$.id'),"
      "        NULL"
      "      )"
      "    ),"
      "    NULL"
      "  ));"
      "CREATE INDEX IF NOT EXISTS messages_idx_target_message_type_time "
      "  ON messages (target_message, type, time);";

  sqlite3_exec(db, query.c_str(), nullptr, nullptr, &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream
      << "Error creating (target_message, type, time) index on messages table: "
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
  return SQLiteSchema::createTable(db, query, "media");
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
  return SQLiteSchema::createTable(db, query, "threads");
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
  return SQLiteSchema::createTable(db, query, "metadata");
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
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  start_reached INTEGER NOT NULL,"
      "  last_navigated_to BIGINT NOT NULL,"
      "  last_pruned BIGINT NOT NULL"
      ");";
  return SQLiteSchema::createTable(db, query, "message_store_threads");
}

bool create_reports_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS reports ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  report TEXT NOT NULL"
      ");";
  return SQLiteSchema::createTable(db, query, "reports");
}

bool create_persist_storage_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS persist_storage ("
      "  key TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  item TEXT NOT NULL"
      ");";
  return SQLiteSchema::createTable(db, query, "persist_storage");
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
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  user_info TEXT NOT NULL"
      ");";
  return SQLiteSchema::createTable(db, query, "users");
}

bool create_keyservers_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS keyservers ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  keyserver_info TEXT NOT NULL"
      ");";
  return SQLiteSchema::createTable(db, query, "keyservers");
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
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  community_info TEXT NOT NULL"
      ");";
  return SQLiteSchema::createTable(db, query, "communities");
}

bool create_messages_to_device_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS messages_to_device ("
      "  message_id TEXT NOT NULL,"
      "  device_id TEXT NOT NULL,"
      "  user_id TEXT NOT NULL,"
      "  timestamp BIGINT NOT NULL,"
      "  plaintext TEXT NOT NULL,"
      "  ciphertext TEXT NOT NULL,"
      "  PRIMARY KEY (message_id, device_id)"
      ");"

      "CREATE INDEX IF NOT EXISTS messages_to_device_idx_id_timestamp"
      "  ON messages_to_device (device_id, timestamp);";

  return SQLiteSchema::createTable(db, query, "messages_to_device");
}

bool create_integrity_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS integrity_store ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  thread_hash TEXT NOT NULL"
      ");";
  return SQLiteSchema::createTable(db, query, "integrity_store");
}

bool create_synced_metadata_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS synced_metadata ("
      "  name TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  data TEXT NOT NULL"
      ");";
  return SQLiteSchema::createTable(db, query, "synced_metadata");
}

bool create_keyservers_synced(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS keyservers_synced ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  keyserver_info TEXT NOT NULL"
      ");";
  bool success = SQLiteSchema::createTable(db, query, "keyservers_synced");
  if (!success) {
    return false;
  }

  std::string copyData =
      "INSERT INTO keyservers_synced (id, keyserver_info)"
      "SELECT id, keyserver_info "
      "FROM keyservers;";

  char *error;
  sqlite3_exec(db, copyData.c_str(), nullptr, nullptr, &error);
  if (error) {
    return false;
  }

  return true;
}

bool create_aux_user_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS aux_users ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  aux_user_info TEXT NOT NULL"
      ");";
  return SQLiteSchema::createTable(db, query, "aux_users");
}

bool add_version_column_to_olm_persist_sessions_table(sqlite3 *db) {
  char *error;
  sqlite3_exec(
      db,
      "ALTER TABLE olm_persist_sessions "
      "  RENAME COLUMN `target_user_id` TO `target_device_id`; "
      "ALTER TABLE olm_persist_sessions "
      "  ADD COLUMN version INTEGER NOT NULL DEFAULT 1;",
      nullptr,
      nullptr,
      &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error updating olm_persist_sessions table: " << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool create_thread_activity_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS thread_activity ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  thread_activity_store_entry TEXT NOT NULL"
      ");";
  return SQLiteSchema::createTable(db, query, "thread_activity");
}

bool create_received_messages_to_device(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS received_messages_to_device ("
      "  id INTEGER PRIMARY KEY,"
      "  message_id TEXT NOT NULL,"
      "  sender_device_id TEXT NOT NULL,"
      "  plaintext TEXT NOT NULL,"
      "  status TEXT NOT NULL"
      ");";
  return SQLiteSchema::createTable(db, query, "received_messages_to_device");
}

bool recreate_outbound_p2p_messages_table(sqlite3 *db) {
  std::string query =
      "DROP TABLE IF EXISTS messages_to_device;"
      "CREATE TABLE IF NOT EXISTS outbound_p2p_messages ("
      "  message_id TEXT NOT NULL,"
      "  device_id TEXT NOT NULL,"
      "  user_id TEXT NOT NULL,"
      "  timestamp BIGINT NOT NULL,"
      "  plaintext TEXT NOT NULL,"
      "  ciphertext TEXT NOT NULL,"
      "  status TEXT NOT NULL,"
      "  PRIMARY KEY (message_id, device_id)"
      ");"

      "CREATE INDEX IF NOT EXISTS outbound_p2p_messages_idx_id_timestamp"
      "  ON outbound_p2p_messages (device_id, timestamp);";

  return SQLiteSchema::createTable(db, query, "outbound_p2p_messages");
}

bool create_entries_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS entries ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  entry TEXT NOT NULL"
      ");";
  return SQLiteSchema::createTable(db, query, "entries");
}

bool create_message_store_local_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS message_store_local ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  local_message_info TEXT NOT NULL"
      ");";
  return SQLiteSchema::createTable(db, query, "message_store_local");
}

bool add_supports_auto_retry_column_to_p2p_messages_table(sqlite3 *db) {
  char *error;
  sqlite3_exec(
      db,
      "ALTER TABLE outbound_p2p_messages"
      "  ADD COLUMN supports_auto_retry INTEGER DEFAULT 0",
      nullptr,
      nullptr,
      &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error updating outbound_p2p_messages table: " << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool create_message_search_table(sqlite3 *db) {
  std::string query =
      "CREATE VIRTUAL TABLE IF NOT EXISTS message_search USING fts5("
      "  original_message_id UNINDEXED,"
      "  message_id UNINDEXED,"
      "  processed_content,"
      "  tokenize = porter"
      ");";
  return SQLiteSchema::createTable(db, query, "message_search");
}

bool recreate_inbound_p2p_messages_table(sqlite3 *db) {
  std::string query =
      "DROP TABLE IF EXISTS received_messages_to_device;"
      "CREATE TABLE IF NOT EXISTS inbound_p2p_messages ("
      "  id INTEGER PRIMARY KEY,"
      "  message_id TEXT NOT NULL,"
      "  sender_device_id TEXT NOT NULL,"
      "  plaintext TEXT NOT NULL,"
      "  status TEXT NOT NULL,"
      "  sender_user_id TEXT NOT NULL"
      ");";

  return SQLiteSchema::createTable(db, query, "inbound_p2p_messages");
}

bool add_timestamps_column_to_threads_table(sqlite3 *db) {
  char *error;
  sqlite3_exec(
      db,
      "ALTER TABLE threads"
      "  ADD COLUMN timestamps TEXT;",
      nullptr,
      nullptr,
      &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error updating threads table: " << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool create_dm_operations_table(sqlite3 *db) {
  std::string query =
      "CREATE TABLE IF NOT EXISTS dm_operations ("
      "  id TEXT PRIMARY KEY,"
      "  type TEXT NOT NULL,"
      "  operation TEXT NOT NULL"
      ");"
      "CREATE INDEX IF NOT EXISTS dm_operations_idx_type"
      "  ON dm_operations (type);";

  return SQLiteSchema::createTable(db, query, "dm_operations");
}

SQLiteMigrations SQLiteSchema::legacyMigrations{
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
     {37, {create_integrity_table, true}},
     {38, {[](sqlite3 *) { return true; }, false}},
     {39, {create_synced_metadata_table, true}},
     {40, {create_keyservers_synced, true}},
     {41, {create_aux_user_table, true}},
     {42, {add_version_column_to_olm_persist_sessions_table, true}},
     {43, {create_thread_activity_table, true}},
     {44, {create_received_messages_to_device, true}},
     {45, {recreate_outbound_p2p_messages_table, true}},
     {46, {create_entries_table, true}},
     {47, {create_message_store_local_table, true}},
     {48, {create_messages_idx_target_message_type_time, true}},
     {49, {add_supports_auto_retry_column_to_p2p_messages_table, true}},
     {50, {create_message_search_table, true}},
     {51, {update_messages_idx_target_message_type_time, true}},
     {52, {recreate_inbound_p2p_messages_table, true}},
     {53, {add_timestamps_column_to_threads_table, true}},
     {54, {create_dm_operations_table, true}}}};

} // namespace comm
