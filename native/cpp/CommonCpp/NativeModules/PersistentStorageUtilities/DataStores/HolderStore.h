#pragma once

#include "../../../DatabaseManagers/entities/Holder.h"
#include "../../DBOperationBase.h"
#include "BaseDataStore.h"
#include "HolderStoreOperations.h"

#include <jsi/jsi.h>

namespace comm {

class HolderStore : public BaseDataStore<DBOperationBase, Holder> {
private:
  static OperationType REMOVE_OPERATION;
  static OperationType REPLACE_OPERATION;

public:
  HolderStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);

  std::vector<std::unique_ptr<DBOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<Holder>> dataVectorPtr) const override;
};

} // namespace comm