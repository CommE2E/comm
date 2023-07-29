#include "SQLiteRawQueryExecutor.h"
#include "Logger.h"

#include <sqlite3.h>
#include <functional>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

namespace comm {

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

      "CREATE TABLE IF NOT EXISTS reports ("
      "	 id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "	 report TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS persist_storage ("
      "  key TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  item TEXT NOT NULL"
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
     {30, {create_persist_storage_table, true}}}};

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

void SQLiteRawQueryExecutor::migrate(sqlite3 *db) {
  auto db_version = get_database_version(db);
  std::stringstream version_msg;
  version_msg << "db version: " << db_version << std::endl;
  Logger::log(version_msg.str());

  if (db_version == 0) {
    auto db_created = set_up_database(db);
    if (!db_created) {
      throw std::runtime_error("Database structure creation error");
    }
    Logger::log("Database structure created.");
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
      throw std::runtime_error(migration_msg.str());
    }
    if (migrationResult == MigrationResult::SUCCESS) {
      migration_msg << "migration " << idx << " succeeded." << std::endl;
      Logger::log(migration_msg.str());
    }
  }
}

} // namespace comm
