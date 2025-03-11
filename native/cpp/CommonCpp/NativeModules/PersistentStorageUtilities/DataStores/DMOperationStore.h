#pragma once

#include "../../../DatabaseManagers/entities/DMOperation.h"
#include "../../DBOperationBase.h"
#include "BaseDataStore.h"
#include "DMOperationStoreOperations.h"

#include <jsi/jsi.h>

namespace comm {

class DMOperationStore : public BaseDataStore<DBOperationBase, DMOperation> {
private:
  static OperationType REMOVE_OPERATION;
  static OperationType REMOVE_ALL_OPERATION;
  static OperationType REPLACE_OPERATION;

public:
  DMOperationStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);

  std::vector<std::unique_ptr<DBOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<DMOperation>> dataVectorPtr) const override;
};

} // namespace comm
