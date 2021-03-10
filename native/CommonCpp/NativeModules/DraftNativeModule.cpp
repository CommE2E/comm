#include "DraftNativeModule.h"
#include "DatabaseManager.h"

namespace comm {

jsi::String DraftNativeModule::getDraft(
  jsi::Runtime &rt,
  const jsi::String &threadID
) {
  std::string str = DatabaseManager::getInstance().getDraft(rt);
  return jsi::String::createFromUtf8(rt, str);
}

bool DraftNativeModule::updateDraft(
  jsi::Runtime &rt,
  const jsi::Object &draft
) {
  jsi::String threadID = draft.getProperty(rt, "threadID").asString(rt);
  jsi::String newText = draft.getProperty(rt, "text").asString(rt);
  return true;
}

} // namespace comm
