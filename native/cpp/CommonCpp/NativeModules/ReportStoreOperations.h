#pragma once

#include "../DatabaseManagers/entities/Media.h"
#include "../DatabaseManagers/entities/Report.h"
#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {

class RemoveReportsOperation : public DBOperationBase {
public:
  RemoveReportsOperation(jsi::Runtime &rt, const jsi::Object &payload)
      : ids_to_remove{} {
    auto payload_ids = payload.getProperty(rt, "ids").asObject(rt).asArray(rt);
    for (size_t idx = 0; idx < payload_ids.size(rt); idx++) {
      this->ids_to_remove.push_back(
          payload_ids.getValueAtIndex(rt, idx).asString(rt).utf8(rt));
    }
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeReports(this->ids_to_remove);
  }

private:
  std::vector<std::string> ids_to_remove;
};

class ReplaceReportOperation : public DBOperationBase {
public:
  ReplaceReportOperation(jsi::Runtime &rt, const jsi::Object &payload) {
    auto report_id = payload.getProperty(rt, "id").asString(rt).utf8(rt);
    auto report_data = payload.getProperty(rt, "report").asString(rt).utf8(rt);

    this->report = std::make_unique<Report>(Report{report_id, report_data});
  }
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).replaceReport(
        std::move(*this->report));
  }

private:
  std::unique_ptr<Report> report;
};

class RemoveAllReportsOperation : public DBOperationBase {
public:
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeAllReports();
  }
};

} // namespace comm
