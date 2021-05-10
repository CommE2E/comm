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
  std::string getDraft(jsi::Runtime &rt, std::string key) const override;
  void updateDraft(jsi::Runtime &rt, std::string key, std::string text)
      const override;
};

} // namespace comm
