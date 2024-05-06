#pragma once

#include "../../../DatabaseManagers/entities/CommunityInfo.h"
#include "BaseDataStore.h"
#include "CommunityStoreOperations.h"
#include "DBOperationBase.h"

#include <jsi/jsi.h>

namespace comm {

class CommunityStore : public BaseDataStore<DBOperationBase, CommunityInfo> {
private:
  static OperationType REMOVE_OPERATION;
  static OperationType REMOVE_ALL_OPERATION;
  static OperationType REPLACE_OPERATION;

public:
  CommunityStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);

  std::vector<std::unique_ptr<DBOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<CommunityInfo>> dataVectorPtr) const override;
};

} // namespace comm
