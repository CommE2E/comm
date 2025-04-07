#pragma once

#include "../../../DatabaseManagers/entities/MessageSearchResult.h"
#include "../../DBOperationBase.h"
#include "../../MessageSearchStoreOperations.h"
#include "BaseDataStore.h"

#include <jsi/jsi.h>

namespace comm {

class MessageSearchStore
    : public BaseDataStore<DBOperationBase, MessageSearchResult> {
private:
  static OperationType UPDATE_OPERATION;
  static OperationType DELETE_OPERATION;

public:
  MessageSearchStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);

  std::vector<std::unique_ptr<DBOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<MessageSearchResult>> dataVectorPtr)
      const override;
};

} // namespace comm
