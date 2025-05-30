#include "SQLiteBackup.h"

#include "SQLiteUtils.h"
#include "entities/EntityQueryHelpers.h"

#include <sqlite3.h>
#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>

namespace comm {

std::unordered_set<std::string> SQLiteBackup::tablesAllowlist = {
    "drafts",
    "threads",
    "message_store_threads",
    "users",
    "synced_metadata",
    "aux_users",
    "entries",
};

void SQLiteBackup::cleanupDatabaseExceptAllowlist(sqlite3 *db) {
  std::vector<std::string> tables = SQLiteUtils::getAllTableNames(db);

  std::ostringstream removeDeviceSpecificDataSQL;
  for (const auto &tableName : tables) {
    if (SQLiteBackup::tablesAllowlist.find(tableName) ==
        SQLiteBackup::tablesAllowlist.end()) {
      removeDeviceSpecificDataSQL << "DELETE FROM " << tableName << ";"
                                  << std::endl;
    }
  }

  std::string sqlQuery = removeDeviceSpecificDataSQL.str();
  if (!sqlQuery.empty()) {
    executeQuery(db, sqlQuery);
  }
}

std::string SQLiteBackup::restoreFromMainCompaction(
    std::string mainCompactionPath,
    std::string mainCompactionEncryptionKey,
    std::optional<std::string> plaintextDatabasePath,
    std::string maxVersion) {

  if (!SQLiteUtils::fileExists(mainCompactionPath)) {
    std::string errorMessage{"Restore attempt but backup file does not exist"};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  sqlite3 *backupDB;
  if (!SQLiteUtils::isDatabaseQueryable(
          backupDB, true, mainCompactionPath, mainCompactionEncryptionKey)) {
    std::string errorMessage{"Backup file or encryption key corrupted"};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  std::string plaintextBackupPath =
      plaintextDatabasePath.value_or(mainCompactionPath + "_plaintext");
  if (SQLiteUtils::fileExists(plaintextBackupPath)) {
    SQLiteUtils::attemptDeleteFile(
        plaintextBackupPath,
        "Failed to delete plaintext backup file from previous backup "
        "attempt.");
  }

  sqlite3_open(mainCompactionPath.c_str(), &backupDB);
  std::string plaintextMigrationDBQuery = "PRAGMA key = \"x'" +
      mainCompactionEncryptionKey +
      "'\";"
      "ATTACH DATABASE '" +
      plaintextBackupPath +
      "' AS plaintext KEY '';"
      "SELECT sqlcipher_export('plaintext');"
      "DETACH DATABASE plaintext;";
  executeQuery(backupDB, plaintextMigrationDBQuery);
  int databaseVersion = SQLiteUtils::getDatabaseVersion(backupDB);
  std::stringstream restoreMessage;
  restoreMessage << "Restoring database with version " << databaseVersion
                 << std::endl;
  Logger::log(restoreMessage.str());

  sqlite3_close(backupDB);

  sqlite3_open(plaintextBackupPath.c_str(), &backupDB);
  SQLiteUtils::setDatabaseVersion(backupDB, databaseVersion);

  SQLiteUtils::attemptDeleteFile(
      mainCompactionPath,
      "Failed to delete main compaction file after successful restore.");

  return plaintextBackupPath;
}

} // namespace comm
