#include "DMOperationStore.h"

#include "../../DBOperationBase.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {
OperationType DMOperationStore::REMOVE_OPERATION = "remove_dm_operations";
OperationType DMOperationStore::REMOVE_ALL_OPERATION =
    "remove_all_dm_operations";
OperationType DMOperationStore::REPLACE_OPERATION = "replace_dm_operation";
OperationType DMOperationStore::ADD_OPERATION = "add_queued_dm_operation";
OperationType DMOperationStore::CLEAR_OPERATION = "clear_dm_operations_queue";
OperationType DMOperationStore::PRUNE_OPERATION = "prune_queued_dm_operations";

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

jsi::Array DMOperationStore::parseDBQueuedDMOperations(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<QueuedDMOperation>> dataVectorPtr) const {
  size_t numOperations = dataVectorPtr->size();
  jsi::Array jsiOperations = jsi::Array(rt, numOperations);
  size_t writeIdx = 0;
  for (const QueuedDMOperation &operation : *dataVectorPtr) {
    jsi::Object jsiOperation = jsi::Object(rt);
    jsiOperation.setProperty(rt, "queueType", operation.queue_type);
    jsiOperation.setProperty(rt, "queueKey", operation.queue_key);
    jsiOperation.setProperty(rt, "operationData", operation.operation_data);
    jsiOperation.setProperty(rt, "timestamp", operation.timestamp);
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
    } else if (opType == ADD_OPERATION) {
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      std::string queueType =
          payloadObj.getProperty(rt, "queueType").asString(rt).utf8(rt);
      std::string queueKey =
          payloadObj.getProperty(rt, "queueKey").asString(rt).utf8(rt);
      std::string operationData =
          payloadObj.getProperty(rt, "operationData").asString(rt).utf8(rt);
      std::string timestamp =
          payloadObj.getProperty(rt, "timestamp").asString(rt).utf8(rt);

      QueuedDMOperation operation{
          queueType, queueKey, operationData, timestamp};
      dmOperationStoreOps.push_back(
          std::make_unique<AddQueuedDMOperationOperation>(
              std::move(operation)));
    } else if (opType == CLEAR_OPERATION) {
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      std::string queueType =
          payloadObj.getProperty(rt, "queueType").asString(rt).utf8(rt);
      std::string queueKey =
          payloadObj.getProperty(rt, "queueKey").asString(rt).utf8(rt);

      dmOperationStoreOps.push_back(
          std::make_unique<ClearQueuedDMOperationsOperation>(
              queueType, queueKey));
    } else if (opType == PRUNE_OPERATION) {
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      std::string timestamp =
          payloadObj.getProperty(rt, "timestamp").asString(rt).utf8(rt);

      dmOperationStoreOps.push_back(
          std::make_unique<PruneQueuedDMOperationsOperation>(timestamp));
    } else {
      throw std::runtime_error("unsupported operation: " + opType);
    }
  };
  return dmOperationStoreOps;
}

} // namespace comm
