#pragma once

#include "DatabaseManagerInterface.h"

namespace comm {

class SQLiteManager : public DatabaseManagerInterface {
public:
  SQLiteManager();
  // to be removed
  std::string getDraft(jsi::Runtime &rt) const override;
};

} // namespace comm
