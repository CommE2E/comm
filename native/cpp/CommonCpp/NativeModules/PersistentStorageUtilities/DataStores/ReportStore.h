#pragma once

#include "../../../DatabaseManagers/entities/Report.h"
#include "BaseDataStore.h"
#include "ReportStoreOperations.h"

#include <jsi/jsi.h>

namespace comm {

class ReportStore : public BaseDataStore<ReportStoreOperationBase, Report> {
private:
  static OperationType REPLACE_REPORT_OPERATION;
  static OperationType REMOVE_REPORTS_OPERATION;
  static OperationType REMOVE_ALL_REPORTS_OPERATION;

public:
  ReportStore();
  ~ReportStore();

  std::vector<std::unique_ptr<ReportStoreOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<Report>> dataVectorPtr) const override;
};

} // namespace comm
