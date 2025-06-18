#include "EntryStore.h"

#include "../../DBOperationBase.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {
OperationType EntryStore::REMOVE_OPERATION = "remove_entries";
OperationType EntryStore::REMOVE_ALL_OPERATION = "remove_all_entries";
OperationType EntryStore::REPLACE_OPERATION = "replace_entry";

EntryStore::EntryStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array EntryStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<EntryInfo>> entriesVectorPtr) const {
  size_t numEntries = entriesVectorPtr->size();
  jsi::Array jsiEntries = jsi::Array(rt, numEntries);
  size_t writeIdx = 0;
  for (const EntryInfo &entry : *entriesVectorPtr) {
    jsi::Object jsiEntry = jsi::Object(rt);
    jsiEntry.setProperty(rt, "id", entry.id);
    jsiEntry.setProperty(rt, "entry", entry.entry);
    jsiEntries.setValueAtIndex(rt, writeIdx++, jsiEntry);
  }
  return jsiEntries;
}

std::vector<std::unique_ptr<DBOperationBase>> EntryStore::createOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) const {
  std::vector<std::unique_ptr<DBOperationBase>> entryStoreOps;

  for (size_t idx = 0; idx < operations.size(rt); idx++) {
    jsi::Object op = operations.getValueAtIndex(rt, idx).asObject(rt);
    std::string opType = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (opType == REMOVE_OPERATION) {
      std::vector<std::string> entryIDsToRemove;
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      jsi::Array entryIDs =
          payloadObj.getProperty(rt, "ids").asObject(rt).asArray(rt);
      for (int entryIdx = 0; entryIdx < entryIDs.size(rt); entryIdx++) {
        entryIDsToRemove.push_back(
            entryIDs.getValueAtIndex(rt, entryIdx).asString(rt).utf8(rt));
      }
      entryStoreOps.push_back(std::make_unique<RemoveEntriesOperation>(
          std::move(entryIDsToRemove)));
    } else if (opType == REMOVE_ALL_OPERATION) {
      entryStoreOps.push_back(std::make_unique<RemoveAllEntriesOperation>());
    } else if (opType == REPLACE_OPERATION) {
      jsi::Object entryObj = op.getProperty(rt, "payload").asObject(rt);
      std::string id = entryObj.getProperty(rt, "id").asString(rt).utf8(rt);
      std::string entry_info =
          entryObj.getProperty(rt, "entry").asString(rt).utf8(rt);
      bool isBackedUp = op.getProperty(rt, "isBackedUp").asBool();

      EntryInfo entry{id, entry_info};

      entryStoreOps.push_back(std::make_unique<ReplaceEntryOperation>(
          std::move(entry), isBackedUp));
    } else {
      throw std::runtime_error("unsupported operation: " + opType);
    }
  };
  return entryStoreOps;
}

} // namespace comm
