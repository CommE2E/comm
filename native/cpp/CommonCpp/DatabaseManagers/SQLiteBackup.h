#pragma once

#include <sqlite3.h>
#include <optional>
#include <string>
#include <unordered_set>

namespace comm {
class SQLiteBackup {
public:
  static std::unordered_set<std::string> tablesAllowlist;

  static void cleanupDatabaseExceptAllowlist(sqlite3 *db);

  // Restores a database from a main compaction file that was previously backed
  // up.
  // This function takes a path to the encrypted main compaction file, decrypts
  // it using a provided encryption key, and then saves the decrypted data to a
  // specified plaintext database path or to a default location if no path is
  // provided. After decryption, the original encrypted file is deleted. The
  // function also checks the version of the backup file against the maximum
  // version supported by the application. If the version in the backup exceeds
  // the supported version, the function throws an exception to prevent
  // potential incompatibility issues.
  static std::string restoreFromMainCompaction(
      std::string mainCompactionPath,
      std::string mainCompactionEncryptionKey,
      std::optional<std::string> plaintextDatabasePath,
      std::string maxVersion);
};
} // namespace comm
