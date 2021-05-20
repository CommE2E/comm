#pragma once

#include "DatabaseThread.h"
#include "NativeModules.h"
#include <jsi/jsi.h>

namespace comm {

namespace jsi = facebook::jsi;

class CommCoreModule : public facebook::react::CommCoreModuleSchemaCxxSpecJSI {
  DatabaseThread databaseThread;

  jsi::Value getDraft(jsi::Runtime &rt, const jsi::String &key) override;
  jsi::Value updateDraft(jsi::Runtime &rt, const jsi::Object &draft) override;
  jsi::Value getAllDrafts(jsi::Runtime &rt) override;

public:
  CommCoreModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
      : facebook::react::CommCoreModuleSchemaCxxSpecJSI(jsInvoker){};
};

} // namespace comm
