#include "ReportStore.h"

#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {

using namespace facebook::react;

OperationType ReportStore::REPLACE_REPORT_OPERATION = "replace_report";
OperationType ReportStore::REMOVE_REPORTS_OPERATION = "remove_reports";
OperationType ReportStore::REMOVE_ALL_REPORTS_OPERATION = "remove_all_reports";

ReportStore::ReportStore(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array ReportStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<Report>> reportStoreVectorPtr) const {
  size_t numReports = reportStoreVectorPtr->size();
  jsi::Array jsiReports = jsi::Array(rt, numReports);
  size_t writeIdx = 0;

  for (const Report &report : *reportStoreVectorPtr) {
    jsi::Object jsiReport = jsi::Object(rt);
    jsiReport.setProperty(rt, "id", report.id);
    jsiReport.setProperty(rt, "report", report.report);
    jsiReports.setValueAtIndex(rt, writeIdx++, jsiReport);
  }
  return jsiReports;
}

std::vector<std::unique_ptr<ReportStoreOperationBase>>
ReportStore::createOperations(jsi::Runtime &rt, const jsi::Array &operations)
    const {
  std::vector<std::unique_ptr<ReportStoreOperationBase>> reportStoreOps;
  for (auto idx = 0; idx < operations.size(rt); idx++) {
    auto op = operations.getValueAtIndex(rt, idx).asObject(rt);
    auto op_type = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (op_type == REMOVE_ALL_REPORTS_OPERATION) {
      reportStoreOps.push_back(std::make_unique<RemoveAllReportsOperation>());
      continue;
    }

    auto payload_obj = op.getProperty(rt, "payload").asObject(rt);
    if (op_type == REPLACE_REPORT_OPERATION) {
      reportStoreOps.push_back(
          std::make_unique<ReplaceReportOperation>(rt, payload_obj));
    } else if (op_type == REMOVE_REPORTS_OPERATION) {
      reportStoreOps.push_back(
          std::make_unique<RemoveReportsOperation>(rt, payload_obj));
    } else {
      throw std::runtime_error{"unsupported operation: " + op_type};
    }
  }
  return reportStoreOps;
}

} // namespace comm
