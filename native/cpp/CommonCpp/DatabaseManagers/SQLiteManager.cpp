#include "SQLiteManager.h"
#include "sqlite_orm.h"

#include <memory>
#include <string>

namespace comm {

using namespace sqlite_orm;

std::string SQLiteManager::sqliteFilePath;

auto SQLiteManager::getStorage() {
  static auto storage = make_storage(
      SQLiteManager::sqliteFilePath,
      make_table(
          "drafts",
          make_column("threadID", &Draft::key, unique(), primary_key()),
          make_column("text", &Draft::text)));
  return storage;
}

SQLiteManager::SQLiteManager() {
  SQLiteManager::getStorage().sync_schema(true);
}

std::string SQLiteManager::getDraft(jsi::Runtime &rt, std::string key) const {
  std::unique_ptr<Draft> draft =
      SQLiteManager::getStorage().get_pointer<Draft>(key);
  return (draft == nullptr) ? "" : draft->text;
}

void SQLiteManager::updateDraft(
    jsi::Runtime &rt,
    std::string key,
    std::string text) const {
  Draft draft = {key, text};
  SQLiteManager::getStorage().replace(draft);
}

} // namespace comm
