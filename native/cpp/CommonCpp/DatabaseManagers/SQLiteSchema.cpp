#include "SQLiteSchema.h"

#include "../NativeModules/PersistentStorageUtilities/MessageOperationsUtilities/MessageTypeEnum.h"
#include "Logger.h"
#include "SQLiteUtils.h"

#include <sqlite3.h>

#include <fstream>
#include <sstream>
#include <string>

namespace comm {

bool SQLiteSchema::createSchema(sqlite3 *db) {
  char *error;
  int sidebarSourceTypeInt = static_cast<int>(MessageType::SIDEBAR_SOURCE);
  std::string sidebarSourceType = std::to_string(sidebarSourceTypeInt);
  auto query =
      "CREATE TABLE IF NOT EXISTS drafts ("
      "  key TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  text TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS messages ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  local_id TEXT,"
      "  thread TEXT NOT NULL,"
      "  user TEXT NOT NULL,"
      "  type INTEGER NOT NULL,"
      "  future_type INTEGER,"
      "  content TEXT,"
      "  time INTEGER NOT NULL,"
      "  target_message TEXT AS ("
      "    IIF("
      "      JSON_VALID(content),"
      "      COALESCE("
      "        JSON_EXTRACT(content, '$.targetMessageID'),"
      "        IIF("
      "          type = " +
      sidebarSourceType +
      "          , JSON_EXTRACT(content, '$.id'),"
      "          NULL"
      "        )"
      "      ),"
      "      NULL"
      "    )"
      "  )"
      ");"

      "CREATE TABLE IF NOT EXISTS olm_persist_account ("
      "  id INTEGER UNIQUE PRIMARY KEY NOT NULL,"
      "  account_data TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS olm_persist_sessions ("
      "  target_device_id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  session_data TEXT NOT NULL,"
      "  version INTEGER NOT NULL DEFAULT 1"
      ");"

      "CREATE TABLE IF NOT EXISTS media ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  container TEXT NOT NULL,"
      "  thread TEXT NOT NULL,"
      "  uri TEXT NOT NULL,"
      "  type TEXT NOT NULL,"
      "  extras TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS threads ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  type INTEGER NOT NULL,"
      "  name TEXT,"
      "  description TEXT,"
      "  color TEXT NOT NULL,"
      "  creation_time BIGINT NOT NULL,"
      "  parent_thread_id TEXT,"
      "  containing_thread_id TEXT,"
      "  community TEXT,"
      "  members TEXT NOT NULL,"
      "  roles TEXT NOT NULL,"
      "  current_user TEXT NOT NULL,"
      "  source_message_id TEXT,"
      "  replies_count INTEGER NOT NULL,"
      "  avatar TEXT,"
      "  pinned_count INTEGER NOT NULL DEFAULT 0,"
      "  timestamps TEXT"
      ");"

      "CREATE TABLE IF NOT EXISTS metadata ("
      "  name TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  data TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS message_store_threads ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  start_reached INTEGER NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS reports ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  report TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS persist_storage ("
      "  key TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  item TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS users ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  user_info TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS keyservers ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  keyserver_info TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS keyservers_synced ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  keyserver_info TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS communities ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  community_info TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS outbound_p2p_messages ("
      "  message_id TEXT NOT NULL,"
      "  device_id TEXT NOT NULL,"
      "  user_id TEXT NOT NULL,"
      "  timestamp BIGINT NOT NULL,"
      "  plaintext TEXT NOT NULL,"
      "  ciphertext TEXT NOT NULL,"
      "  status TEXT NOT NULL,"
      "  supports_auto_retry INTEGER DEFAULT 0,"
      "  PRIMARY KEY (message_id, device_id)"
      ");"

      "CREATE TABLE IF NOT EXISTS integrity_store ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  thread_hash TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS synced_metadata ("
      "  name TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  data TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS aux_users ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  aux_user_info TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS thread_activity ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  thread_activity_store_entry TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS inbound_p2p_messages ("
      "  id INTEGER PRIMARY KEY,"
      "  message_id TEXT NOT NULL,"
      "  sender_device_id TEXT NOT NULL,"
      "  plaintext TEXT NOT NULL,"
      "  status TEXT NOT NULL,"
      "  sender_user_id TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS entries ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  entry TEXT NOT NULL"
      ");"

      "CREATE TABLE IF NOT EXISTS message_store_local ("
      "  id TEXT UNIQUE PRIMARY KEY NOT NULL,"
      "  local_message_info TEXT NOT NULL"
      ");"

      "CREATE VIRTUAL TABLE IF NOT EXISTS message_search USING fts5("
      "  original_message_id UNINDEXED,"
      "  message_id UNINDEXED,"
      "  processed_content,"
      "  tokenize = porter"
      ");"

      "CREATE TABLE IF NOT EXISTS dm_operations ("
      "  id TEXT PRIMARY KEY,"
      "  type TEXT NOT NULL,"
      "  operation TEXT NOT NULL"
      ");"

      "CREATE INDEX IF NOT EXISTS media_idx_container"
      "  ON media (container);"

      "CREATE INDEX IF NOT EXISTS messages_idx_thread_time"
      "  ON messages (thread, time);"

      "CREATE INDEX IF NOT EXISTS messages_idx_target_message_type_time"
      "  ON messages (target_message, type, time);"

      "CREATE INDEX IF NOT EXISTS outbound_p2p_messages_idx_id_timestamp"
      "  ON outbound_p2p_messages (device_id, timestamp);"

      "CREATE INDEX IF NOT EXISTS dm_operations_idx_type"
      "  ON dm_operations (type);";

  sqlite3_exec(db, query.c_str(), nullptr, nullptr, &error);

  if (!error) {
    return true;
  }

  std::ostringstream stringStream;
  stringStream << "Error creating tables: " << error;
  Logger::log(stringStream.str());

  sqlite3_free(error);
  return false;
}

bool SQLiteSchema::setupDatabase(sqlite3 *db) {
  sqlite3_exec(db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);
  auto db_version = SQLiteUtils::getDatabaseVersion(db);

  auto latest_version = std::max(
      SQLiteSchema::legacyMigrations.back().first,
      SQLiteSchema::migrations.back().first);

  if (db_version == latest_version) {
    sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
    return true;
  }

  if (db_version != 0 || !createSchema(db) ||
      !SQLiteUtils::setDatabaseVersion(db, latest_version)) {
    sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
    return false;
  }
  sqlite3_exec(db, "END TRANSACTION;", nullptr, nullptr, nullptr);
  return true;
}

bool SQLiteSchema::createTable(
    sqlite3 *db,
    std::string query,
    std::string tableName) {
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

MigrationResult SQLiteSchema::applyMigrationWithTransaction(
    sqlite3 *db,
    const MigrateFunction &migrate,
    int index) {
  sqlite3_exec(db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);
  auto db_version = SQLiteUtils::getDatabaseVersion(db);
  if (index <= db_version) {
    sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
    return MigrationResult::NOT_APPLIED;
  }
  auto rc = migrate(db);
  if (!rc) {
    sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
    return MigrationResult::FAILURE;
  }
  auto database_version_set = SQLiteUtils::setDatabaseVersion(db, index);
  if (!database_version_set) {
    sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
    return MigrationResult::FAILURE;
  }
  sqlite3_exec(db, "END TRANSACTION;", nullptr, nullptr, nullptr);
  return MigrationResult::SUCCESS;
}

MigrationResult SQLiteSchema::applyMigrationWithoutTransaction(
    sqlite3 *db,
    const MigrateFunction &migrate,
    int index) {
  auto db_version = SQLiteUtils::getDatabaseVersion(db);
  if (index <= db_version) {
    return MigrationResult::NOT_APPLIED;
  }
  auto rc = migrate(db);
  if (!rc) {
    return MigrationResult::FAILURE;
  }
  sqlite3_exec(db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);
  auto inner_db_version = SQLiteUtils::getDatabaseVersion(db);
  if (index <= inner_db_version) {
    sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
    return MigrationResult::NOT_APPLIED;
  }
  auto database_version_set = SQLiteUtils::setDatabaseVersion(db, index);
  if (!database_version_set) {
    sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
    return MigrationResult::FAILURE;
  }
  sqlite3_exec(db, "END TRANSACTION;", nullptr, nullptr, nullptr);
  return MigrationResult::SUCCESS;
}

void SQLiteSchema::legacyMigrate(sqlite3 *db) {
  for (const auto &[idx, migration] : legacyMigrations) {
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
}

bool SQLiteSchema::migrate(
    sqlite3 *db,
    SQLiteMigrationIdentifier migrationIdentifier) {
  for (const auto &[idx, migration] : migrations) {
    if (idx != migrationIdentifier) {
      continue;
    };

    const auto &[applyMigration, shouldBeInTransaction] = migration;

    MigrationResult migrationResult;
    if (shouldBeInTransaction) {
      migrationResult = applyMigrationWithTransaction(db, applyMigration, idx);
    } else {
      migrationResult =
          applyMigrationWithoutTransaction(db, applyMigration, idx);
    }

    if (migrationResult == MigrationResult::NOT_APPLIED) {
      return true;
    }

    std::stringstream migration_msg;
    if (migrationResult == MigrationResult::FAILURE) {
      migration_msg << "migration " << idx << " failed." << std::endl;
      Logger::log(migration_msg.str());
      return false;
    }
    if (migrationResult == MigrationResult::SUCCESS) {
      migration_msg << "migration " << idx << " succeeded." << std::endl;
      Logger::log(migration_msg.str());
      return true;
    }
  }

  return false;
}

} // namespace comm
