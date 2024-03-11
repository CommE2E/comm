#pragma once

#include "../../../DatabaseManagers/entities/IntegrityThreadHash.h"
#include "BaseDataStore.h"
#include "IntegrityStoreOperations.h"

#include <jsi/jsi.h>

namespace comm {

class IntegrityStore
    : public BaseDataStore<IntegrityStoreOperationBase, IntegrityThreadHash> {
private:
  static OperationType REMOVE_OPERATION;
  static OperationType REMOVE_ALL_OPERATION;
  static OperationType REPLACE_OPERATION;

public:
  IntegrityStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);

  std::vector<std::unique_ptr<IntegrityStoreOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<IntegrityThreadHash>> dataVectorPtr)
      const override;
};

} // namespace comm
