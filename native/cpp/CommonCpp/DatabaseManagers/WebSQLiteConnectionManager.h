#pragma once

#include "SQLiteConnectionManager.h"

namespace comm {
class WebSQLiteConnectionManager : public SQLiteConnectionManager {

public:
  WebSQLiteConnectionManager();
  ~WebSQLiteConnectionManager();

  sqlite3 *getEphemeralConnection(
      std::string sqliteFilePath,
      std::string sqliteEncryptionKey) override;
  void initializeConnection(
      std::string sqliteFilePath,
      std::string sqliteEncryptionKey) override;
  void closeConnection() override;
};
} // namespace comm
