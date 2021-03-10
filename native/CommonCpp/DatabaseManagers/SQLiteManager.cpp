#include <string>
#include "SQLiteManager.h"

namespace comm {

SQLiteManager::SQLiteManager() {}

std::string SQLiteManager::getDraft(jsi::Runtime &rt) const {
  return "working draft from SQLiteManager!";
}

} // namespace comm
