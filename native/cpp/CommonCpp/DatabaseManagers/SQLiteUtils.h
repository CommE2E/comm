#pragma once

#include <sqlite3.h>

#include <optional>
#include <string>

namespace comm {

class SQLiteUtils {
public:
  static int getDatabaseVersion(sqlite3 *db);
  static bool setDatabaseVersion(sqlite3 *db, int db_version);
  static void setEncryptionKey(sqlite3 *db, const std::string &encryptionKey);
  static bool fileExists(const std::string &filePath);
  static void
  attemptDeleteFile(const std::string &filePath, const char *errorMessage);
  static void attemptRenameFile(
      const std::string &oldPath,
      const std::string &newPath,
      const char *errorMessage);
  static bool isDatabaseQueryable(
      bool use_encryption_key,
      const std::string &path,
      const std::string &encryptionKey);
  static void validateEncryption(
      const std::string &sqliteFilePath,
      const std::string &encryptionKey);
  static void rekeyDatabase(sqlite3 *db, const std::string &encryptionKey);
  static std::vector<std::string> getAllTableNames(sqlite3 *db);
};

} // namespace comm
