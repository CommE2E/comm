#pragma once

#include "../../../DatabaseManagers/entities/Draft.h"
#include "BaseDataStore.h"
#include "DraftStoreOperations.h"

#include <jsi/jsi.h>

namespace comm {

class DraftStore : public BaseDataStore<DraftStoreOperationBase, Draft> {
private:
  static OperationType UPDATE_DRAFT_OPERATION;
  static OperationType MOVE_DRAFT_OPERATION;
  static OperationType REMOVE_ALL_DRAFTS_OPERATION;

public:
  DraftStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);

  std::vector<std::unique_ptr<DraftStoreOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<Draft>> dataVectorPtr) const override;
};

} // namespace comm
