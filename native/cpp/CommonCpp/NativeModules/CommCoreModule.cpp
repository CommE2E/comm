#include "CommCoreModule.h"
#include "DatabaseManager.h"

#include <ReactCommon/TurboModuleUtils.h>

namespace comm {

using namespace facebook::react;

jsi::Value CommCoreModule::getDraft(jsi::Runtime &rt, const jsi::String &key) {
  std::string keyStr = key.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string draftStr =
              DatabaseManager::getQueryExecutor().getDraft(keyStr);
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            jsi::String draft = jsi::String::createFromUtf8(innerRt, draftStr);
            promise->resolve(std::move(draft));
          });
        };
        this->databaseThread.scheduleTask(job);
      });
}

jsi::Value
CommCoreModule::updateDraft(jsi::Runtime &rt, const jsi::Object &draft) {
  std::string keyStr = draft.getProperty(rt, "key").asString(rt).utf8(rt);
  std::string textStr = draft.getProperty(rt, "text").asString(rt).utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          DatabaseManager::getQueryExecutor().updateDraft(keyStr, textStr);
          this->jsInvoker_->invokeAsync(
              [=, &innerRt]() { promise->resolve(true); });
        };
        this->databaseThread.scheduleTask(job);
      });
}

jsi::Value CommCoreModule::getAllDrafts(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          auto draftsVector =
              DatabaseManager::getQueryExecutor().getAllDrafts();

          size_t numDrafts = count_if(
              draftsVector.begin(), draftsVector.end(), [](Draft draft) {
                return !draft.text.empty();
              });
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            jsi::Array jsiDrafts = jsi::Array(innerRt, numDrafts);

            size_t writeIndex = 0;
            for (Draft draft : draftsVector) {
              if (draft.text.empty()) {
                continue;
              }
              auto jsiDraft = jsi::Object(innerRt);
              jsiDraft.setProperty(innerRt, "key", draft.key);
              jsiDraft.setProperty(innerRt, "text", draft.text);
              jsiDrafts.setValueAtIndex(innerRt, writeIndex++, jsiDraft);
            }
            promise->resolve(std::move(jsiDrafts));
          });
        };
        this->databaseThread.scheduleTask(job);
      });
}

} // namespace comm
