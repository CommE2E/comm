#pragma once

#include "../../../DatabaseManagers/entities/Thread.h"
#include "BaseDataStore.h"
#include "ThreadStoreOperations.h"

#include <jsi/jsi.h>

namespace comm {

class ThreadStore : public BaseDataStore<ThreadStoreOperationBase, Thread> {
private:
  static OperationType REMOVE_OPERATION;
  static OperationType REMOVE_ALL_OPERATION;
  static OperationType REPLACE_OPERATION;

public:
  ThreadStore();
  ~ThreadStore();

  std::vector<std::unique_ptr<ThreadStoreOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<Thread>> dataVectorPtr) const override;
};

} // namespace comm
