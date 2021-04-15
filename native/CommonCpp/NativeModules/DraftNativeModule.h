#pragma once

#include <jsi/jsi.h>
#include "NativeModules.h"

namespace comm {

namespace jsi = facebook::jsi;

class DraftNativeModule : public facebook::react::DraftSchemaCxxSpecJSI {
  jsi::String getDraft(jsi::Runtime &rt, const jsi::String &threadID) override;
  bool updateDraft(jsi::Runtime &rt, const jsi::Object &draft) override;
public:
  DraftNativeModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker) :
    facebook::react::DraftSchemaCxxSpecJSI(jsInvoker) {};
};

} // namespace comm
