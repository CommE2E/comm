#pragma once

#include "DatabaseIdentifier.h"
#include "DatabaseQueryExecutor.h"
#include "NativeSQLiteConnectionManager.h"
#include "SQLiteQueryExecutor.h"

#include <mutex>

namespace comm {

class DatabaseManager {
  // Connection manager instance, should be only one (globally) to each
  // database.
  // DatabaseIdentifier::MAIN connectionManager.
  static std::shared_ptr<NativeSQLiteConnectionManager> mainConnectionManager;
  // DatabaseIdentifier::RESTORED connectionManager.
  static std::shared_ptr<NativeSQLiteConnectionManager>
      restoredConnectionManager;

  // Indicate that at least one instance of SQLiteQueryExecutor was created,
  // which is identical to finishing the migration process and having a fully
  // operational database that can be used by application logic.
  static std::once_flag queryExecutorCreationIndicated;
  static void indicateQueryExecutorCreation();

  // Indicate that all properties needed to create an instance of
  // SQLiteQueryExecutor were initialized in a thread-safe way (keys were read
  // from SecureStore or generated).
  static std::once_flag sqliteQueryExecutorPropertiesInitialized;
  static void
  initializeSQLiteQueryExecutorProperties(std::string &databasePath);

  // Creates restoredConnectionManager instance based on data from SecureStore.
  static void initializeRestoredConnectionManager();

  // Generate and persist a backup key used as a database encryption key.
  static std::string generateBackupDataKey();
  // Generate and persist key used for encrypt backup logs.
  static std::string generateBackupLogDataKey();

  static void setDatabaseStatusAsWorkable();

  // Clearing the main database should recreate a new database from scratch and
  // initialize `connectionManager`.
  static void clearMainDatabaseSensitiveData();
  // Clearing the backup database should delete all contents and unset
  // `connectionManager`.
  static void clearRestoredDatabaseSensitiveData();

  static bool isPrimaryDevice();
  static bool isPrimaryDevice(const AuxUserInfo &currentUserDBInfo);

public:
  static const DatabaseQueryExecutor &getQueryExecutor();
  static const DatabaseQueryExecutor &getQueryExecutor(DatabaseIdentifier id);

  static void clearSensitiveData();
  static void initializeQueryExecutor(std::string &databasePath);
  static bool checkIfDatabaseNeedsDeletion();
  static void reportDBOperationsFailure();

  // Set SQLite keys to keep using the previous User Data keys. It is required
  // to upload User Keys during restoring RPC and be able to restore again even
  // if User Data upload fails (which is not part of a single RPC).
  // By default, it is applied to the main database.
  static void setUserDataKeys(
      const std::string &backupDataKey,
      const std::string &backupLogDataKey);

  // Backup methods
  static void captureBackupLogForLastOperation();
  static void triggerBackupFileUpload();
  static void createMainCompaction(
      std::string backupID,
      std::string mainCompactionEncryptionKey,
      std::string newLogEncryptionKey);
  static void restoreFromMainCompaction(
      std::string mainCompactionPath,
      std::string mainCompactionEncryptionKey,
      std::string maxVersion);
  static void copyContentFromBackupDatabase();
};

} // namespace comm
