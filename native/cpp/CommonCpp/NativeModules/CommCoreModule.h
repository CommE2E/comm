#pragma once

#include "../Tools/WorkerThread.h"
#include "NativeModules.h"
#include <jsi/jsi.h>

namespace comm {

namespace jsi = facebook::jsi;

class CommCoreModule : public facebook::react::CommCoreModuleSchemaCxxSpecJSI {
  WorkerThread databaseThread;

  jsi::Value getDraft(jsi::Runtime &rt, const jsi::String &key) override;
  jsi::Value updateDraft(jsi::Runtime &rt, const jsi::Object &draft) override;
  jsi::Value moveDraft(
      jsi::Runtime &rt,
      const jsi::String &oldKey,
      const jsi::String &newKey) override;
  jsi::Value getAllDrafts(jsi::Runtime &rt) override;
  jsi::Value removeAllDrafts(jsi::Runtime &rt) override;
  jsi::Value removeAllMessages(jsi::Runtime &rt) override;
  jsi::Value getAllMessages(jsi::Runtime &rt) override;
  jsi::Value processMessageStoreOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) override;

public:
  CommCoreModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);
};

} // namespace comm
