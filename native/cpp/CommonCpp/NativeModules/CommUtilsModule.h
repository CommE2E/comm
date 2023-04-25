#pragma once

#include "../CryptoTools/Tools.h"
#include "../Tools/WorkerThread.h"
#include "../_generated/utilsJSI.h"
#include "olm/olm.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>
#include <memory>
#include <vector>

namespace comm {

namespace jsi = facebook::jsi;
using ::comm::crypto::OlmBuffer;

class CommUtilsModule
    : public facebook::react::CommUtilsModuleSchemaCxxSpecJSI {
  std::unique_ptr<WorkerThread> utilsThread;

  OlmBuffer olmUtilityBuffer;
  ::OlmUtility *olmUtility;

  virtual jsi::Value writeBufferToFile(
      jsi::Runtime &rt,
      jsi::String path,
      jsi::Object data) override;
  virtual jsi::Value
  readBufferFromFile(jsi::Runtime &rt, jsi::String path) override;
  virtual jsi::String
  base64EncodeBuffer(jsi::Runtime &rt, jsi::Object data) override;
  virtual jsi::String sha256(jsi::Runtime &rt, jsi::Object data) override;

public:
  CommUtilsModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);
};

} // namespace comm
