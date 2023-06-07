#include "CommQueryCreator.h"
#include "DatabaseManager.h"

#include "sqlite3.h"
#include "sqlite_orm.h"
#include <iostream>

#include <string>

#ifdef EMSCRIPTEN
#include <emscripten/bind.h>
#endif

namespace comm {

std::string CommQueryCreator::mockDatabaseOperation(std::string key) {
  std::stringstream query;
  query << "SQL QUERY WHERE key=" << key << ";";
  return query.str();
}

CommQueryCreator::CommQueryCreator(std::string path) {
  std::cout << "Path: " << path << std::endl;
  SQLiteQueryExecutor::sqliteFilePath = path;
  this->instance = SQLiteQueryExecutor();
}

void CommQueryCreator::updateDraft(std::string key, std::string text) {
  this->instance.updateDraft(key, text);
}
bool CommQueryCreator::moveDraft(std::string oldKey, std::string newKey) {
  this->instance.moveDraft(oldKey, newKey);
  return true;
}
std::vector<Draft> CommQueryCreator::getAllDrafts() {
  return this->instance.getAllDrafts();
}
void CommQueryCreator::removeAllDrafts() {
  this->instance.removeAllDrafts();
}

void CommQueryCreator::setMetadata(std::string entry_name, std::string data) {
  this->instance.setMetadata(entry_name, data);
}
void CommQueryCreator::clearMetadata(std::string entry_name) {
  this->instance.clearMetadata(entry_name);
}
std::string CommQueryCreator::getMetadata(std::string entry_name) {
  return this->instance.getMetadata(entry_name);
}

void CommQueryCreator::replaceReport(const Report &report) {
  this->instance.replaceReport(report);
}
void CommQueryCreator::removeReports(const std::vector<std::string> &ids) {
  this->instance.removeReports(ids);
}
void CommQueryCreator::removeAllReports() {
  this->instance.removeAllReports();
}
std::vector<Report> CommQueryCreator::getAllReports() {
  return this->instance.getAllReports();
}

} // namespace comm

#ifdef EMSCRIPTEN
EMSCRIPTEN_BINDINGS(CommQueryCreator) {
  // vectors
  emscripten::register_vector<comm::Draft>("DraftVector");
  emscripten::register_vector<comm::Report>("ReportVector");
  emscripten::register_vector<std::string>("StringVector");

  // data structures
  emscripten::value_object<comm::Draft>("Draft")
      .field("key", &comm::Draft::key)
      .field("text", &comm::Draft::text);
  emscripten::value_object<comm::Report>("Report")
      .field("id", &comm::Report::id)
      .field("report", &comm::Report::report);

  // query executor class
  emscripten::class_<comm::CommQueryCreator>("CommQueryCreator")
      .constructor<std::string>()
      .class_function(
          "mockDatabaseOperation",
          &comm::CommQueryCreator::mockDatabaseOperation)
      .function("updateDraft", &comm::CommQueryCreator::updateDraft)
      .function("moveDraft", &comm::CommQueryCreator::moveDraft)
      .function("getAllDrafts", &comm::CommQueryCreator::getAllDrafts)
      .function("removeAllDrafts", &comm::CommQueryCreator::removeAllDrafts)
      .function("setMetadata", &comm::CommQueryCreator::setMetadata)
      .function("clearMetadata", &comm::CommQueryCreator::clearMetadata)
      .function("getMetadata", &comm::CommQueryCreator::getMetadata)
      .function("replaceReport", &comm::CommQueryCreator::replaceReport)
      .function("removeReports", &comm::CommQueryCreator::removeReports)
      .function("removeAllReports", &comm::CommQueryCreator::removeAllReports)
      .function("getAllReports", &comm::CommQueryCreator::getAllReports);
}
#endif
