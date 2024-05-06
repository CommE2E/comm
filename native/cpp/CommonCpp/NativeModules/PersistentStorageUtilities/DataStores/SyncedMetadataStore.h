#pragma once

#include "../../../DatabaseManagers/entities/SyncedMetadataEntry.h"
#include "BaseDataStore.h"
#include "DBOperationBase.h"
#include "SyncedMetadataStoreOperations.h"

#include <jsi/jsi.h>

namespace comm {

class SyncedMetadataStore
    : public BaseDataStore<DBOperationBase, SyncedMetadataEntry> {
private:
  static OperationType REMOVE_OPERATION;
  static OperationType REMOVE_ALL_OPERATION;
  static OperationType REPLACE_OPERATION;

public:
  SyncedMetadataStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);

  std::vector<std::unique_ptr<DBOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<SyncedMetadataEntry>> dataVectorPtr)
      const override;
};

} // namespace comm
