#include "ThreadActivityStore.h"

#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {

OperationType ThreadActivityStore::REPLACE_OPERATION =
    "replace_thread_activity_entry";
OperationType ThreadActivityStore::REMOVE_OPERATION =
    "remove_thread_activity_entries";
OperationType ThreadActivityStore::REMOVE_ALL_OPERATION =
    "remove_all_thread_activity_entries";

ThreadActivityStore::ThreadActivityStore(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array ThreadActivityStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<ThreadActivityEntry>> threadActivityVectorPtr)
    const {
  jsi::Array jsiThreadActivityEntries = jsi::Array(rt, 0);
  return jsiThreadActivityEntries;
}

std::vector<std::unique_ptr<ThreadActivityStoreOperationBase>>
ThreadActivityStore::createOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) const {
  std::vector<std::unique_ptr<ThreadActivityStoreOperationBase>>
      threadActivityStoreOps;

  for (size_t idx = 0; idx < operations.size(rt); idx++) {
    jsi::Object op = operations.getValueAtIndex(rt, idx).asObject(rt);
    std::string opType = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (opType == REMOVE_OPERATION) {
      std::vector<std::string> threadIDsToRemove;
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      jsi::Array threadIDs =
          payloadObj.getProperty(rt, "ids").asObject(rt).asArray(rt);
      for (int threadIdx = 0; threadIdx < threadIDs.size(rt); threadIdx++) {
        threadIDsToRemove.push_back(
            threadIDs.getValueAtIndex(rt, threadIdx).asString(rt).utf8(rt));
      }
      threadActivityStoreOps.push_back(
          std::make_unique<RemoveThreadActivityEntriesOperation>(
              std::move(threadIDsToRemove)));
    } else if (opType == REMOVE_ALL_OPERATION) {
      threadActivityStoreOps.push_back(
          std::make_unique<RemoveAllThreadActivityEntriesOperation>());
    } else if (opType == REPLACE_OPERATION) {
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      std::string id = payloadObj.getProperty(rt, "id").asString(rt).utf8(rt);
      std::string thread_activity_store_entry =
          payloadObj.getProperty(rt, "threadActivityStoreEntry")
              .asString(rt)
              .utf8(rt);

      ThreadActivityEntry threadActivityEntry{id, thread_activity_store_entry};

      threadActivityStoreOps.push_back(
          std::make_unique<ReplaceThreadActivityEntryOperation>(
              std::move(threadActivityEntry)));
    } else {
      throw std::runtime_error("unsupported operation: " + opType);
    }
  };
  return threadActivityStoreOps;
}

} // namespace comm
