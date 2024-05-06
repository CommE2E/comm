#pragma once

#include "../../../DatabaseManagers/entities/AuxUserInfo.h"
#include "AuxUserStoreOperations.h"
#include "BaseDataStore.h"
#include "DBOperationBase.h"

#include <jsi/jsi.h>

namespace comm {

class AuxUserStore : public BaseDataStore<DBOperationBase, AuxUserInfo> {
private:
  static OperationType REMOVE_OPERATION;
  static OperationType REMOVE_ALL_OPERATION;
  static OperationType REPLACE_OPERATION;

public:
  AuxUserStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);

  std::vector<std::unique_ptr<DBOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<AuxUserInfo>> dataVectorPtr) const override;
};

} // namespace comm
