#pragma once

#include "SQLiteConnectionManager.h"

namespace comm {
class WebSQLiteConnectionManager : public SQLiteConnectionManager {

public:
  WebSQLiteConnectionManager(std::string sqliteFilePath);
  ~WebSQLiteConnectionManager();

  sqlite3 *getEphemeralConnection() override;
  void initializeConnection() override;
  void closeConnection() override;

  void validateEncryption() override;

  void setSQLiteFilePath(std::string sqliteFilePath);
};
} // namespace comm
