#pragma once

#include "DatabaseManagerInterface.h"

#include <string>

namespace comm {

class SQLiteManager : public DatabaseManagerInterface {
public:
  static std::string sqliteFilePath;
  
  SQLiteManager();
  // to be removed
  std::string getDraft(jsi::Runtime &rt) const override;
};

} // namespace comm
