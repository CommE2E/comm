#pragma once

#include <string>
#include "DatabaseManager.h"

#include "./entities/Draft.h"

namespace comm {

//IGNORE: some drafting of module returning query and values to bind
// typedef std::string QueryTemplate;
// typedef std::variant<int, double, std::string> QueryBinding;
// typedef std::pair<QueryTemplate, std::vector<QueryBinding>> Query;

// this could inherit from DatabaseQueryExecutor
class CommQueryCreator {
private:
  SQLiteQueryExecutor instance;

public:
  static std::string mockDatabaseOperation(std::string key);
  CommQueryCreator(std::string path);
  void updateDraft(std::string key, std::string text);
  bool moveDraft(std::string oldKey, std::string newKey);
  std::vector<Draft> getAllDrafts();
  void removeAllDrafts();
  void setMetadata(std::string entry_name, std::string data);
  void clearMetadata(std::string entry_name);
  std::string getMetadata(std::string entry_name);
  void replaceReport(const Report &report);
  void removeReports(const std::vector<std::string> &ids);
  void removeAllReports();
  std::vector<Report> getAllReports();
};

} // namespace comm
