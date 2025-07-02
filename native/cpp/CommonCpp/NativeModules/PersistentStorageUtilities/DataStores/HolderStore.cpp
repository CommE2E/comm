#include "HolderStore.h"

#include "../../DBOperationBase.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {
OperationType HolderStore::REMOVE_OPERATION = "remove_holders";
OperationType HolderStore::REPLACE_OPERATION = "replace_holders";

HolderStore::HolderStore(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array HolderStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<Holder>> holdersVectorPtr) const {
  size_t numHolders = holdersVectorPtr->size();
  jsi::Array jsiHolders = jsi::Array(rt, numHolders);
  size_t writeIdx = 0;
  for (const Holder &holder : *holdersVectorPtr) {
    jsi::Object jsiHolder = jsi::Object(rt);
    jsiHolder.setProperty(rt, "hash", holder.hash);
    jsiHolder.setProperty(rt, "holder", holder.holder);
    jsiHolder.setProperty(rt, "status", holder.status);
    jsiHolders.setValueAtIndex(rt, writeIdx++, jsiHolder);
  }
  return jsiHolders;
}

std::vector<std::unique_ptr<DBOperationBase>> HolderStore::createOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) const {
  std::vector<std::unique_ptr<DBOperationBase>> holderStoreOps;

  for (size_t idx = 0; idx < operations.size(rt); idx++) {
    jsi::Object op = operations.getValueAtIndex(rt, idx).asObject(rt);
    std::string opType = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (opType == REMOVE_OPERATION) {
      std::vector<std::string> hashesToRemove;
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      jsi::Array hashes =
          payloadObj.getProperty(rt, "hashes").asObject(rt).asArray(rt);
      for (int i = 0; i < hashes.size(rt); i++) {
        hashesToRemove.push_back(
            hashes.getValueAtIndex(rt, i).asString(rt).utf8(rt));
      }
      holderStoreOps.push_back(
          std::make_unique<RemoveHoldersOperation>(std::move(hashesToRemove)));
    } else if (opType == REPLACE_OPERATION) {
      std::vector<Holder> holdersToReplace;
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      jsi::Array items =
          payloadObj.getProperty(rt, "items").asObject(rt).asArray(rt);
      for (int i = 0; i < items.size(rt); i++) {
        jsi::Object item = items.getValueAtIndex(rt, i).asObject(rt);
        std::string hash = item.getProperty(rt, "hash").asString(rt).utf8(rt);
        std::string holder =
            item.getProperty(rt, "holder").asString(rt).utf8(rt);
        std::string status =
            item.getProperty(rt, "status").asString(rt).utf8(rt);

        Holder holderItem{hash, holder, status};
        holdersToReplace.push_back(std::move(holderItem));
      }

      holderStoreOps.push_back(std::make_unique<ReplaceHoldersOperation>(
          std::move(holdersToReplace)));
    } else {
      throw std::runtime_error("unsupported operation: " + opType);
    }
  };
  return holderStoreOps;
}

} // namespace comm