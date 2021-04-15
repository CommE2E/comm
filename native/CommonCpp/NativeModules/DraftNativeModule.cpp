#include "DraftNativeModule.h"

namespace comm {

jsi::String DraftNativeModule::getDraft(
  jsi::Runtime &rt,
  const jsi::String &threadID
) {
  return jsi::String::createFromUtf8(rt, "This draft is working 43110");
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
