#pragma once

#include "../../../DatabaseManagers/entities/ThreadActivityEntry.h"
#include "BaseDataStore.h"
#include "ThreadActivityStoreOperations.h"

#include <jsi/jsi.h>

namespace comm {

class ThreadActivityStore
    : public BaseDataStore<DBOperationBase, ThreadActivityEntry> {
private:
  static OperationType REMOVE_OPERATION;
  static OperationType REMOVE_ALL_OPERATION;
  static OperationType REPLACE_OPERATION;

public:
  ThreadActivityStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);

  std::vector<std::unique_ptr<DBOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<ThreadActivityEntry>> dataVectorPtr)
      const override;
};

} // namespace comm
