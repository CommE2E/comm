#include "CommValidationModule.h"
#include "PersistentStorageUtilities/MessageOperationsUtilities/MessageSpecs.h"

#include <sstream>
#include <string>
#include <vector>

namespace comm {
using namespace facebook::react;

CommValidationModule::CommValidationModule(
    std::shared_ptr<CallInvoker> jsInvoker)
    : CommValidationModuleSchemaCxxSpecJSI(jsInvoker) {
}

jsi::Value CommValidationModule::validateMessageTypes(
    jsi::Runtime &rt,
    jsi::Array messageTypes) {

  std::vector<std::string> errors;
  for (auto idx = 0; idx < messageTypes.size(rt); idx++) {
    auto messageTypeObj = messageTypes.getValueAtIndex(rt, idx).asObject(rt);
    auto messageTypeKey =
        messageTypeObj.getProperty(rt, "messageTypeKey").asString(rt).utf8(rt);
    auto messageTypeInt =
        messageTypeObj.getProperty(rt, "messageType").asNumber();
    auto messageType = static_cast<MessageType>(messageTypeInt);

    if (messageSpecsHolder.find(messageType) != messageSpecsHolder.end()) {
      continue;
    }
    errors.push_back(messageTypeKey);
  }
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        this->jsInvoker_->invokeAsync(
            [=]() {
              if (errors.size()) {
                std::ostringstream errorStream;
                errorStream
                    << "MessageSpec not implemented in C++ for message types: ";
                for (const auto &it : errors) {
                  errorStream << it << ", ";
                }
                promise->reject(errorStream.str());
              } else {
                promise->resolve(jsi::Value::undefined());
              }
            });
      });
}
} // namespace comm
