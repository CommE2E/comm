#include "SQLiteManager.h"
#include <memory>
#include <string>

namespace comm {

std::string SQLiteManager::sqliteFilePath;

auto SQLiteManager::getStorage() {
  static auto storage = make_storage(
      SQLiteManager::sqliteFilePath,
      make_table(
          "drafts",
          make_column("threadID", &Draft::threadID, unique(), primary_key()),
          make_column("text", &Draft::text)));
  return storage;
}

SQLiteManager::SQLiteManager() {
  SQLiteManager::getStorage().sync_schema(true);
}

std::string
SQLiteManager::getDraft(jsi::Runtime &rt, std::string threadID) const {
  std::unique_ptr<Draft> draft =
      SQLiteManager::getStorage().get_pointer<Draft>(threadID);
  return (draft == nullptr) ? "" : draft->text;
}

void SQLiteManager::updateDraft(
    jsi::Runtime &rt,
    std::string threadID,
    std::string text) const {
  Draft draft = {threadID, text};
  SQLiteManager::getStorage().replace(draft);
}

} // namespace comm
