#pragma once

#include "SQLiteConnectionManager.h"

namespace comm {
class WebSQLiteConnectionManager : public SQLiteConnectionManager {

public:
  WebSQLiteConnectionManager(std::string sqliteFilePath);
  ~WebSQLiteConnectionManager();

  sqlite3 *getEphemeralConnection() const override;
  void initializeConnection() override;
  void closeConnection() override;
  virtual void validateEncryption() override;
};
} // namespace comm
