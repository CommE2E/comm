#pragma once

#include "../../../DatabaseManagers/entities/EntryInfo.h"
#include "../../DBOperationBase.h"
#include "BaseDataStore.h"
#include "EntryStoreOperations.h"

#include <jsi/jsi.h>

namespace comm {

class EntryStore : public BaseDataStore<DBOperationBase, EntryInfo> {
private:
  static OperationType REMOVE_OPERATION;
  static OperationType REMOVE_ALL_OPERATION;
  static OperationType REPLACE_OPERATION;

public:
  EntryStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);

  std::vector<std::unique_ptr<DBOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<EntryInfo>> dataVectorPtr) const override;
};

} // namespace comm