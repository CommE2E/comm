#include "CommConstants.h"
#include "PersistentStorageUtilities/MessageOperationsUtilities/MessageSpecs.h"

namespace comm {

CommConstants::CommConstants() {
}

std::vector<jsi::PropNameID> CommConstants::getPropertyNames(jsi::Runtime &rt) {
  std::vector<jsi::PropNameID> result;
  result.push_back(
      jsi::PropNameID::forUtf8(rt, std::string("NATIVE_MESSAGE_TYPES")));
  return result;
}

jsi::Value
CommConstants::get(jsi::Runtime &rt, const jsi::PropNameID &propName) {
  auto name = propName.utf8(rt);
  if (name == "NATIVE_MESSAGE_TYPES") {
    return prepareNativeMessageTypesArray(rt);
  }
  return jsi::Value::undefined();
}

jsi::Array CommConstants::prepareNativeMessageTypesArray(jsi::Runtime &rt) {
  jsi::Array messageTypesArray = jsi::Array(rt, messageSpecsHolder.size());

  size_t writeIndex = 0;
  for (const auto &typeSpecPair : messageSpecsHolder) {
    auto nativeMessageType = static_cast<int>(typeSpecPair.first);
    messageTypesArray.setValueAtIndex(
        rt, writeIndex++, jsi::Value(nativeMessageType));
  }
  return messageTypesArray;
}

} // namespace comm
