#include "KeyserverStore.h"

#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {

OperationType KeyserverStore::REMOVE_OPERATION = "remove_keyserver";
OperationType KeyserverStore::REMOVE_ALL_OPERATION = "remove_all_keyservers";
OperationType KeyserverStore::REPLACE_OPERATION = "replace_keyserver";

KeyserverStore::KeyserverStore(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array KeyserverStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<KeyserverInfo>> keyserversVectorPtr) const {
  size_t numKeyservers = keyserversVectorPtr->size();
  jsi::Array jsiKeyservers = jsi::Array(rt, numKeyservers);
  size_t writeIdx = 0;
  for (const KeyserverInfo &keyserver : *keyserversVectorPtr) {
    jsi::Object jsiKeyserver = jsi::Object(rt);
    jsiKeyserver.setProperty(rt, "id", keyserver.id);
    jsiKeyserver.setProperty(rt, "keyserverInfo", keyserver.keyserver_info);
    jsiKeyservers.setValueAtIndex(rt, writeIdx++, jsiKeyserver);
  }
  return jsiKeyservers;
}

std::vector<std::unique_ptr<KeyserverStoreOperationBase>>
KeyserverStore::createOperations(jsi::Runtime &rt, const jsi::Array &operations)
    const {
  std::vector<std::unique_ptr<KeyserverStoreOperationBase>> keyserverStoreOps;

  for (size_t idx = 0; idx < operations.size(rt); idx++) {
    jsi::Object op = operations.getValueAtIndex(rt, idx).asObject(rt);
    std::string opType = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (opType == REMOVE_OPERATION) {
      std::vector<std::string> KeyserverIDsToRemove;
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      std::string id = payloadObj.getProperty(rt, "id").asString(rt).utf8(rt);

      keyserverStoreOps.push_back(
          std::make_unique<RemoveKeyserverOperation>(id));
    } else if (opType == REMOVE_ALL_OPERATION) {
      keyserverStoreOps.push_back(
          std::make_unique<RemoveAllKeyserversOperation>());
    } else if (opType == REPLACE_OPERATION) {
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      std::string id = payloadObj.getProperty(rt, "id").asString(rt).utf8(rt);
      std::string keyserver_info =
          payloadObj.getProperty(rt, "keyserverInfo").asString(rt).utf8(rt);

      KeyserverInfo keyserver{id, keyserver_info};

      keyserverStoreOps.push_back(
          std::make_unique<ReplaceKeyserverOperation>(std::move(keyserver)));
    } else {
      throw std::runtime_error("unsupported operation: " + opType);
    }
  };
  return keyserverStoreOps;
}

} // namespace comm
