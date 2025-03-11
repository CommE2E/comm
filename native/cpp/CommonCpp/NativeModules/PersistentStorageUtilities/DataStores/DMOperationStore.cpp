#include "DMOperationStore.h"

#include "../../DBOperationBase.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {
OperationType DMOperationStore::REMOVE_OPERATION = "remove_dm_operations";
OperationType DMOperationStore::REMOVE_ALL_OPERATION =
    "remove_all_dm_operations";
OperationType DMOperationStore::REPLACE_OPERATION = "replace_dm_operation";

DMOperationStore::DMOperationStore(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array DMOperationStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<DMOperation>> operationsVectorPtr) const {
  size_t numOperations = operationsVectorPtr->size();
  jsi::Array jsiOperations = jsi::Array(rt, numOperations);
  size_t writeIdx = 0;
  for (const DMOperation &operation : *operationsVectorPtr) {
    jsi::Object jsiOperation = jsi::Object(rt);
    jsiOperation.setProperty(rt, "id", operation.id);
    jsiOperation.setProperty(rt, "type", operation.type);
    jsiOperation.setProperty(rt, "operation", operation.operation);
    jsiOperations.setValueAtIndex(rt, writeIdx++, jsiOperation);
  }
  return jsiOperations;
}

std::vector<std::unique_ptr<DBOperationBase>>
DMOperationStore::createOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) const {
  std::vector<std::unique_ptr<DBOperationBase>> dmOperationStoreOps;

  for (size_t idx = 0; idx < operations.size(rt); idx++) {
    jsi::Object op = operations.getValueAtIndex(rt, idx).asObject(rt);
    std::string opType = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (opType == REMOVE_OPERATION) {
      std::vector<std::string> idsToRemove;
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      jsi::Array ids =
          payloadObj.getProperty(rt, "ids").asObject(rt).asArray(rt);
      for (int i = 0; i < ids.size(rt); i++) {
        idsToRemove.push_back(ids.getValueAtIndex(rt, i).asString(rt).utf8(rt));
      }
      dmOperationStoreOps.push_back(
          std::make_unique<RemoveDMOperationsOperation>(
              std::move(idsToRemove)));
    } else if (opType == REMOVE_ALL_OPERATION) {
      dmOperationStoreOps.push_back(
          std::make_unique<RemoveAllDMOperationsOperation>());
    } else if (opType == REPLACE_OPERATION) {
      jsi::Object obj = op.getProperty(rt, "payload").asObject(rt);
      std::string id = obj.getProperty(rt, "id").asString(rt).utf8(rt);
      std::string type = obj.getProperty(rt, "type").asString(rt).utf8(rt);
      std::string operation =
          obj.getProperty(rt, "operation").asString(rt).utf8(rt);

      DMOperation dmOperation{id, type, operation};

      dmOperationStoreOps.push_back(
          std::make_unique<ReplaceDMOperationOperation>(
              std::move(dmOperation)));
    } else {
      throw std::runtime_error("unsupported operation: " + opType);
    }
  };
  return dmOperationStoreOps;
}

} // namespace comm
