#pragma once

#include "DatabaseManagerInterface.h"
#include "entities/Draft.h"

#include <string>

namespace comm {

class SQLiteManager : public DatabaseManagerInterface {
  static auto getStorage();

public:
  static std::string sqliteFilePath;

  SQLiteManager();
  std::string getDraft(jsi::Runtime &rt, std::string threadID) const override;
  void updateDraft(jsi::Runtime &rt, std::string threadID, std::string text)
      const override;
};

} // namespace comm
