#include "CommCoreModule.h"
#include "DatabaseManager.h"

namespace comm {

jsi::String
CommCoreModule::getDraft(jsi::Runtime &rt, const jsi::String &threadID) {
  std::string threadIDStr = threadID.utf8(rt);
  std::string draft = DatabaseManager::getInstance().getDraft(rt, threadIDStr);
  return jsi::String::createFromUtf8(rt, draft);
}

bool CommCoreModule::updateDraft(jsi::Runtime &rt, const jsi::Object &draft) {
  std::string threadID =
      draft.getProperty(rt, "threadID").asString(rt).utf8(rt);
  std::string text = draft.getProperty(rt, "text").asString(rt).utf8(rt);
  DatabaseManager::getInstance().updateDraft(rt, threadID, text);
  return true;
}

} // namespace comm
