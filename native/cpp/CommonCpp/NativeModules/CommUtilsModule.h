#pragma once

#include "../Tools/WorkerThread.h"
#include "../_generated/utilsJSI.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>
#include <memory>

namespace comm {

namespace jsi = facebook::jsi;

class CommUtilsModule
    : public facebook::react::CommUtilsModuleSchemaCxxSpecJSI {
  std::unique_ptr<WorkerThread> utilsThread;

  virtual jsi::Value writeBufferToFile(
      jsi::Runtime &rt,
      jsi::String path,
      jsi::Object data) override;
  virtual jsi::Value
  readBufferFromFile(jsi::Runtime &rt, jsi::String path) override;
  virtual jsi::String
  base64EncodeBuffer(jsi::Runtime &rt, jsi::Object data) override;

public:
  CommUtilsModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);
};

} // namespace comm
