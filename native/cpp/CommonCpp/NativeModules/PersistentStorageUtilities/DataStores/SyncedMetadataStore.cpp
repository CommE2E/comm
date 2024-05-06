#include "SyncedMetadataStore.h"

#include "DBOperationBase.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {

OperationType SyncedMetadataStore::REMOVE_OPERATION = "remove_synced_metadata";
OperationType SyncedMetadataStore::REMOVE_ALL_OPERATION =
    "remove_all_synced_metadata";
OperationType SyncedMetadataStore::REPLACE_OPERATION =
    "replace_synced_metadata_entry";

SyncedMetadataStore::SyncedMetadataStore(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array SyncedMetadataStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<SyncedMetadataEntry>> syncedMetadataVectorPtr)
    const {
  size_t numSyncedMetadata = syncedMetadataVectorPtr->size();
  jsi::Array jsiSyncedMetadata = jsi::Array(rt, numSyncedMetadata);
  size_t writeIdx = 0;
  for (const SyncedMetadataEntry &syncedMetadataEntry :
       *syncedMetadataVectorPtr) {
    jsi::Object jsiSyncedMetadataEntry = jsi::Object(rt);
    jsiSyncedMetadataEntry.setProperty(rt, "name", syncedMetadataEntry.name);
    jsiSyncedMetadataEntry.setProperty(rt, "data", syncedMetadataEntry.data);
    jsiSyncedMetadata.setValueAtIndex(rt, writeIdx++, jsiSyncedMetadataEntry);
  }
  return jsiSyncedMetadata;
}

std::vector<std::unique_ptr<DBOperationBase>>
SyncedMetadataStore::createOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) const {
  std::vector<std::unique_ptr<DBOperationBase>> syncedMetadataStoreOps;

  for (size_t idx = 0; idx < operations.size(rt); idx++) {
    jsi::Object op = operations.getValueAtIndex(rt, idx).asObject(rt);
    std::string opType = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (opType == REMOVE_OPERATION) {
      std::vector<std::string> syncedMetadataNamesToRemove;
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      jsi::Array syncedMetadataNames =
          payloadObj.getProperty(rt, "names").asObject(rt).asArray(rt);
      for (int nameIdx = 0; nameIdx < syncedMetadataNames.size(rt); nameIdx++) {
        syncedMetadataNamesToRemove.push_back(
            syncedMetadataNames.getValueAtIndex(rt, nameIdx)
                .asString(rt)
                .utf8(rt));
      }
      syncedMetadataStoreOps.push_back(
          std::make_unique<RemoveSyncedMetadataOperation>(
              std::move(syncedMetadataNamesToRemove)));
    } else if (opType == REMOVE_ALL_OPERATION) {
      syncedMetadataStoreOps.push_back(
          std::make_unique<RemoveAllSyncedMetadataOperation>());
    } else if (opType == REPLACE_OPERATION) {
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      std::string name =
          payloadObj.getProperty(rt, "name").asString(rt).utf8(rt);
      std::string data =
          payloadObj.getProperty(rt, "data").asString(rt).utf8(rt);

      SyncedMetadataEntry syncedMetadataEntry{name, data};

      syncedMetadataStoreOps.push_back(
          std::make_unique<ReplaceSyncedMetadataOperation>(
              std::move(syncedMetadataEntry)));
    } else {
      throw std::runtime_error("unsupported operation: " + opType);
    }
  };
  return syncedMetadataStoreOps;
}

} // namespace comm
