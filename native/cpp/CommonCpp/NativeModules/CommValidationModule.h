#pragma once

#include "../_generated/validationJSI.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {
namespace jsi = facebook::jsi;

class CommValidationModule
    : public facebook::react::CommValidationModuleSchemaCxxSpecJSI {
  virtual jsi::Value
  validateMessageTypes(jsi::Runtime &rt, jsi::Array messageTypes) override;

public:
  CommValidationModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);
};
} // namespace comm
