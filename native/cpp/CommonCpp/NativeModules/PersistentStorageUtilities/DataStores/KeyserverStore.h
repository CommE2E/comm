#pragma once

#include "../../../DatabaseManagers/entities/KeyserverInfo.h"
#include "BaseDataStore.h"
#include "KeyserverStoreOperations.h"

#include <jsi/jsi.h>

namespace comm {

class KeyserverStore
    : public BaseDataStore<KeyserverStoreOperationBase, KeyserverInfo> {
private:
  static OperationType REMOVE_OPERATION;
  static OperationType REMOVE_ALL_OPERATION;
  static OperationType REPLACE_OPERATION;

public:
  KeyserverStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);

  std::vector<std::unique_ptr<KeyserverStoreOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<KeyserverInfo>> dataVectorPtr) const override;
};

} // namespace comm
