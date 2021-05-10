#pragma once

#include "DatabaseManagerInterface.h"
#include "entities/Draft.h"

#include <string>

namespace comm {

class SQLiteManager : public DatabaseManagerInterface {
  void migrate();
  static auto getStorage();

public:
  static std::string sqliteFilePath;

  SQLiteManager();
  std::string getDraft(std::string key) const override;
  void updateDraft(std::string key, std::string text) const override;
  std::vector<Draft> getAllDrafts() const override;
};

} // namespace comm
