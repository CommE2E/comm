#include "CommUtilsModule.h"

#include <ReactCommon/TurboModuleUtils.h>

namespace comm {

using namespace facebook::react;

CommUtilsModule::CommUtilsModule(std::shared_ptr<CallInvoker> jsInvoker)
    : CommUtilsModuleSchemaCxxSpecJSI(jsInvoker),
      utilsThread(std::make_unique<WorkerThread>("utils")) {
}

jsi::Value CommUtilsModule::writeBufferToFile(
    jsi::Runtime &rt,
    jsi::String path,
    jsi::Object data) {
  return jsi::Value::undefined();
}

jsi::Value
CommUtilsModule::readBufferFromFile(jsi::Runtime &rt, jsi::String path) {
  return jsi::Value::undefined();
}

jsi::String
CommUtilsModule::base64EncodeBuffer(jsi::Runtime &rt, jsi::Object data) {
  return jsi::Value::undefined();
}

} // namespace comm
