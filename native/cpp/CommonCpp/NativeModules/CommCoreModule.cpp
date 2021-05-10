#include "CommCoreModule.h"
#include "DatabaseManager.h"

namespace comm {

jsi::String CommCoreModule::getDraft(jsi::Runtime &rt, const jsi::String &key) {
  std::string keyStr = key.utf8(rt);
  std::string draft = DatabaseManager::getInstance().getDraft(keyStr);
  return jsi::String::createFromUtf8(rt, draft);
}

bool CommCoreModule::updateDraft(jsi::Runtime &rt, const jsi::Object &draft) {
  std::string key = draft.getProperty(rt, "key").asString(rt).utf8(rt);
  std::string text = draft.getProperty(rt, "text").asString(rt).utf8(rt);
  DatabaseManager::getInstance().updateDraft(key, text);
  return true;
}

jsi::Array CommCoreModule::getAllDrafts(jsi::Runtime &rt) {
  auto draftsVector = DatabaseManager::getInstance().getAllDrafts();

  size_t numDrafts =
      count_if(draftsVector.begin(), draftsVector.end(), [](Draft draft) {
        return !draft.text.empty();
      });
  jsi::Array jsiDrafts = jsi::Array(rt, numDrafts);

  size_t writeIndex = 0;
  for (Draft draft : draftsVector) {
    if (draft.text.empty()) {
      continue;
    }
    auto jsiDraft = jsi::Object(rt);
    jsiDraft.setProperty(rt, "key", draft.key);
    jsiDraft.setProperty(rt, "text", draft.text);
    jsiDrafts.setValueAtIndex(rt, writeIndex++, jsiDraft);
  }
  return jsiDrafts;
}

} // namespace comm
