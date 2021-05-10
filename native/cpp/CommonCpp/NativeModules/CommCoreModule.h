#pragma once

#include "NativeModules.h"
#include <jsi/jsi.h>

namespace comm {

namespace jsi = facebook::jsi;

class CommCoreModule : public facebook::react::CommCoreModuleSchemaCxxSpecJSI {
  jsi::String getDraft(jsi::Runtime &rt, const jsi::String &key) override;
  bool updateDraft(jsi::Runtime &rt, const jsi::Object &draft) override;
  jsi::Array getAllDrafts(jsi::Runtime &rt) override;

public:
  CommCoreModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
      : facebook::react::CommCoreModuleSchemaCxxSpecJSI(jsInvoker){};
};

} // namespace comm
