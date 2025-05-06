#pragma once

#include "SQLiteConnectionManager.h"

namespace comm {
class WebSQLiteConnectionManager : public SQLiteConnectionManager {

public:
  WebSQLiteConnectionManager();
  ~WebSQLiteConnectionManager();

  void closeConnection() override;
};
} // namespace comm
