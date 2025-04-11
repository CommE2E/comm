#include "SQLiteUtils.h"

#include "Logger.h"
#include <sqlite3.h>

#include <fstream>
#include <sstream>
#include <string>

namespace comm {

int SQLiteUtils::getDatabaseVersion(sqlite3 *db) {
  sqlite3_stmt *user_version_stmt;
  sqlite3_prepare_v2(
      db, "PRAGMA user_version;", -1, &user_version_stmt, nullptr);
  sqlite3_step(user_version_stmt);

  int current_user_version = sqlite3_column_int(user_version_stmt, 0);
  sqlite3_finalize(user_version_stmt);
  return current_user_version;
}

bool SQLiteUtils::setDatabaseVersion(sqlite3 *db, int db_version) {
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

void SQLiteUtils::setEncryptionKey(
    sqlite3 *db,
    const std::string &encryptionKey) {
  std::string set_encryption_key_query =
      "PRAGMA key = \"x'" + encryptionKey + "'\";";

  char *error_set_key;
  sqlite3_exec(
      db, set_encryption_key_query.c_str(), nullptr, nullptr, &error_set_key);

  if (error_set_key) {
    std::ostringstream error_message;
    error_message << "Failed to set encryption key: " << error_set_key;
    Logger::log(error_message.str());
    throw std::system_error(
        ECANCELED, std::generic_category(), error_message.str());
  }
}

// This is a temporary solution. In future we want to keep
// a separate table for blob hashes. Tracked on Linear:
// https://linear.app/comm/issue/ENG-6261/introduce-blob-hash-table
std::string
SQLiteUtils::blobHashFromBlobServiceURI(const std::string &mediaURI) {
  static const std::string blobServicePrefix = "comm-blob-service://";
  return mediaURI.substr(blobServicePrefix.size());
}

bool SQLiteUtils::fileExists(const std::string &filePath) {
  std::ifstream file(filePath.c_str());
  return file.good();
}

void SQLiteUtils::attemptDeleteFile(
    const std::string &filePath,
    const char *errorMessage) {
  if (std::remove(filePath.c_str())) {
    std::string message =
        std::string("Error when deleting file ") + errorMessage;
    Logger::log(message);
    throw std::system_error(errno, std::generic_category(), message);
  }
}

void SQLiteUtils::attemptRenameFile(
    const std::string &oldPath,
    const std::string &newPath,
    const char *errorMessage) {
  if (std::rename(oldPath.c_str(), newPath.c_str())) {
    std::string message =
        std::string("Error when renaming file ") + errorMessage;
    Logger::log(message);
    throw std::system_error(errno, std::generic_category(), message);
  }
}

bool SQLiteUtils::isDatabaseQueryable(
    sqlite3 *db,
    bool useEncryptionKey,
    const std::string &path,
    const std::string &encryptionKey) {
  char *err_msg;
  sqlite3_open(path.c_str(), &db);
  // According to SQLCipher documentation running some SELECT is the only way to
  // check for key validity
  if (useEncryptionKey) {
    setEncryptionKey(db, encryptionKey);
  }
  sqlite3_exec(
      db, "SELECT COUNT(*) FROM sqlite_master;", nullptr, nullptr, &err_msg);
  sqlite3_close(db);
  return !err_msg;
}

void SQLiteUtils::validateEncryption(
    const std::string &sqliteFilePath,
    const std::string &encryptionKey) {
  std::string temp_encrypted_db_path = sqliteFilePath + "_temp_encrypted";

  bool temp_encrypted_exists = SQLiteUtils::fileExists(temp_encrypted_db_path);
  bool default_location_exists = SQLiteUtils::fileExists(sqliteFilePath);

  if (temp_encrypted_exists && default_location_exists) {
    Logger::log(
        "Previous encryption attempt failed. Repeating encryption process from "
        "the beginning.");
    SQLiteUtils::attemptDeleteFile(
        temp_encrypted_db_path,
        "Failed to delete corrupted encrypted database.");
  } else if (temp_encrypted_exists && !default_location_exists) {
    Logger::log(
        "Moving temporary encrypted database to default location failed in "
        "previous encryption attempt. Repeating rename step.");
    SQLiteUtils::attemptRenameFile(
        temp_encrypted_db_path,
        sqliteFilePath,
        "Failed to move encrypted database to default location.");
    return;
  } else if (!default_location_exists) {
    Logger::log(
        "Database not present yet. It will be created encrypted under default "
        "path.");
    return;
  }

  sqlite3 *db;
  if (SQLiteUtils::isDatabaseQueryable(
          db, true, sqliteFilePath, encryptionKey)) {
    Logger::log(
        "Database exists under default path and it is correctly encrypted.");
    return;
  }

  if (!SQLiteUtils::isDatabaseQueryable(
          db, false, sqliteFilePath, encryptionKey)) {
    Logger::log(
        "Database exists but it is encrypted with key that was lost. "
        "Attempting database deletion. New encrypted one will be created.");
    SQLiteUtils::attemptDeleteFile(
        sqliteFilePath.c_str(),
        "Failed to delete database encrypted with lost key.");
    return;
  } else {
    Logger::log(
        "Database exists but it is not encrypted. Attempting encryption "
        "process.");
  }
  sqlite3_open(sqliteFilePath.c_str(), &db);

  std::string createEncryptedCopySQL = "ATTACH DATABASE '" +
      temp_encrypted_db_path +
      "' AS encrypted_comm "
      "KEY \"x'" +
      encryptionKey +
      "'\";"
      "SELECT sqlcipher_export('encrypted_comm');"
      "DETACH DATABASE encrypted_comm;";

  char *encryption_error;
  sqlite3_exec(
      db, createEncryptedCopySQL.c_str(), nullptr, nullptr, &encryption_error);

  if (encryption_error) {
    std::string error{
        "Failed to create encrypted copy of the original database"};
    Logger::log(error);
    throw std::system_error(ECANCELED, std::generic_category(), error);
  }
  sqlite3_close(db);

  SQLiteUtils::attemptDeleteFile(
      sqliteFilePath, "Failed to delete unencrypted database.");
  SQLiteUtils::attemptRenameFile(
      temp_encrypted_db_path,
      sqliteFilePath,
      "Failed to move encrypted database to default location.");
  Logger::log("Encryption completed successfully.");
}

} // namespace comm
