#pragma once

#include "../DatabaseManagers/entities/Media.h"
#include "../DatabaseManagers/entities/Report.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {
class ReportStoreOperationBase {
public:
  virtual void execute() = 0;
  virtual ~ReportStoreOperationBase(){};
};

class RemoveReportsOperation : public ReportStoreOperationBase {
public:
  RemoveReportsOperation(jsi::Runtime &rt, const jsi::Object &payload)
      : ids_to_remove{} {
    auto payload_ids = payload.getProperty(rt, "ids").asObject(rt).asArray(rt);
    for (size_t idx = 0; idx < payload_ids.size(rt); idx++) {
      this->ids_to_remove.push_back(
          payload_ids.getValueAtIndex(rt, idx).asString(rt).utf8(rt));
    }
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeReports(this->ids_to_remove);
  }

private:
  std::vector<std::string> ids_to_remove;
};

class ReplaceReportOperation : public ReportStoreOperationBase {
public:
  ReplaceReportOperation(jsi::Runtime &rt, const jsi::Object &payload) {
    auto report_id = payload.getProperty(rt, "id").asString(rt).utf8(rt);
    auto report_data = payload.getProperty(rt, "report").asString(rt).utf8(rt);

    this->report = std::make_unique<Report>(Report{report_id, report_data});
  }
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().replaceReport(std::move(*this->report));
  }

private:
  std::unique_ptr<Report> report;
};

class RemoveAllReportsOperation : public ReportStoreOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllReports();
  }
};

} // namespace comm
