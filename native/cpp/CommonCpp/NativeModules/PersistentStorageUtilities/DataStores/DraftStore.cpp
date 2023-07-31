#include "DraftStore.h"

#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {

OperationType DraftStore::UPDATE_DRAFT_OPERATION = "update";
OperationType DraftStore::MOVE_DRAFT_OPERATION = "move";
OperationType DraftStore::REMOVE_ALL_DRAFTS_OPERATION = "remove_all";

DraftStore::DraftStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array DraftStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<Draft>> draftsVectorPtr) const {
  size_t numDrafts = count_if(
      draftsVectorPtr->begin(), draftsVectorPtr->end(), [](Draft draft) {
        return !draft.text.empty();
      });
  jsi::Array jsiDrafts = jsi::Array(rt, numDrafts);

  size_t writeIndex = 0;
  for (Draft draft : *draftsVectorPtr) {
    if (draft.text.empty()) {
      continue;
    }
    auto jsiDraft = jsi::Object(rt);
    jsiDraft.setProperty(rt, "key", draft.key);
    jsiDraft.setProperty(rt, "text", draft.text);
    jsiDrafts.setValueAtIndex(rt, writeIndex++, jsiDraft);
  }
  return jsiDrafts;
}

std::vector<std::unique_ptr<DraftStoreOperationBase>>
DraftStore::createOperations(jsi::Runtime &rt, const jsi::Array &operations)
    const {
  std::vector<std::unique_ptr<DraftStoreOperationBase>> draftStoreOps;
  for (auto idx = 0; idx < operations.size(rt); idx++) {
    auto op = operations.getValueAtIndex(rt, idx).asObject(rt);
    auto op_type = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (op_type == REMOVE_ALL_DRAFTS_OPERATION) {
      draftStoreOps.push_back(std::make_unique<RemoveAllDraftsOperation>());
      continue;
    }

    auto payload_obj = op.getProperty(rt, "payload").asObject(rt);
    if (op_type == UPDATE_DRAFT_OPERATION) {
      draftStoreOps.push_back(
          std::make_unique<UpdateDraftOperation>(rt, payload_obj));
    } else if (op_type == MOVE_DRAFT_OPERATION) {
      draftStoreOps.push_back(
          std::make_unique<MoveDraftOperation>(rt, payload_obj));
    } else {
      throw std::runtime_error("unsupported operation: " + op_type);
    }
  }
  return draftStoreOps;
}

} // namespace comm
