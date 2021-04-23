#pragma once

#include "sqlite_orm.h"
#include "DatabaseManagerInterface.h"
#include "entities/Draft.h"

#include <string>

namespace comm {

using namespace sqlite_orm;

class SQLiteManager : public DatabaseManagerInterface {
  static auto getStorage();
public:
  static std::string sqliteFilePath;

  SQLiteManager();
  std::string getDraft(jsi::Runtime &rt, std::string threadID) const override;
  void updateDraft(
    jsi::Runtime &rt,
    std::string threadID,
    std::string text
  ) const override;
};

} // namespace comm
