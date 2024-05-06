#pragma once

#include "../../../DatabaseManagers/entities/UserInfo.h"
#include "BaseDataStore.h"
#include "DBOperationBase.h"
#include "UserStoreOperations.h"

#include <jsi/jsi.h>

namespace comm {

class UserStore : public BaseDataStore<DBOperationBase, UserInfo> {
private:
  static OperationType REMOVE_OPERATION;
  static OperationType REMOVE_ALL_OPERATION;
  static OperationType REPLACE_OPERATION;

public:
  UserStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);

  std::vector<std::unique_ptr<DBOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<UserInfo>> dataVectorPtr) const override;
};

} // namespace comm
