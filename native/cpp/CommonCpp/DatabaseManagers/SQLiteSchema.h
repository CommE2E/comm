#pragma once

#include <sqlite3.h>
#include <functional>
#include <string>
#include <vector>

namespace comm {

enum class MigrationResult { SUCCESS, FAILURE, NOT_APPLIED };

typedef bool ShouldBeInTransaction;

typedef unsigned int SQLiteMigrationIdentifier;

typedef std::function<bool(sqlite3 *)> MigrateFunction;

typedef std::pair<MigrateFunction, ShouldBeInTransaction> SQLiteMigration;

typedef std::vector<std::pair<SQLiteMigrationIdentifier, SQLiteMigration>>
    SQLiteMigrations;

class SQLiteSchema {
private:
  // Legacy migrations, modifications to this property should not be done.
  // Those migrations are C++ specific and executed each time
  // the `SQLiteQueryExecutor` object is created.
  // Implementation in SQLiteSchemaLegacyMigrations.cpp
  static SQLiteMigrations legacyMigrations;

  // SQLite migrations that are currently in use, triggered from the JS level.
  // Note that those migrations can be executed not only after application
  // update but also after restoring an older backup version.
  // Implementation in SQLiteSchemaMigrations.cpp
  static SQLiteMigrations migrations;

  // Running migrations and handling the database version.
  static MigrationResult applyMigrationWithTransaction(
      sqlite3 *db,
      const MigrateFunction &migrate,
      int index);
  // Running migrations and handling the database version.
  static MigrationResult applyMigrationWithoutTransaction(
      sqlite3 *db,
      const MigrateFunction &migrate,
      int index);
  // Creating database schema from scratch.
  static bool createSchema(sqlite3 *db);

public:
  // Utility method used to create a table during migration. This should be used
  // only in the context of this class, but couldn't be private because
  // migrations are defined as a standalone function, so it wouldn't be
  // possible to implement this as private.
  static bool
  createTable(sqlite3 *db, std::string query, std::string tableName);
  // Method to create a database schema from scratch and handle the version.
  static bool setupDatabase(sqlite3 *db);
  // Method to run legacy migrations.
  static void legacyMigrate(sqlite3 *db);
  // Method to run specific migration.
  static bool
  migrate(sqlite3 *db, SQLiteMigrationIdentifier migrationIdentifier);
};

} // namespace comm
