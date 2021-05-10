#include "CommCoreModule.h"
#include "DatabaseManager.h"

namespace comm {

jsi::String CommCoreModule::getDraft(jsi::Runtime &rt, const jsi::String &key) {
  std::string keyStr = key.utf8(rt);
  std::string draft = DatabaseManager::getInstance().getDraft(rt, keyStr);
  return jsi::String::createFromUtf8(rt, draft);
}

bool CommCoreModule::updateDraft(jsi::Runtime &rt, const jsi::Object &draft) {
  std::string key = draft.getProperty(rt, "key").asString(rt).utf8(rt);
  std::string text = draft.getProperty(rt, "text").asString(rt).utf8(rt);
  DatabaseManager::getInstance().updateDraft(rt, key, text);
  return true;
}

} // namespace comm
