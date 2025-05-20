#pragma once

#include "../DatabaseManagers/entities/ThreadActivityEntry.h"
#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {

class RemoveThreadActivityEntriesOperation : public DBOperationBase {
public:
  RemoveThreadActivityEntriesOperation(std::vector<std::string> ids)
      : ids{ids} {
  }

  virtual void execute(std::string db) override {
    DatabaseManager::getQueryExecutor(db).removeThreadActivityEntries(
        this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceThreadActivityEntryOperation : public DBOperationBase {
public:
  ReplaceThreadActivityEntryOperation(ThreadActivityEntry &&threadActivityEntry)
      : threadActivityEntry{std::move(threadActivityEntry)} {
  }

  virtual void execute(std::string db) override {
    DatabaseManager::getQueryExecutor(db).replaceThreadActivityEntry(
        this->threadActivityEntry);
  }

private:
  ThreadActivityEntry threadActivityEntry;
};

class RemoveAllThreadActivityEntriesOperation : public DBOperationBase {
public:
  virtual void execute(std::string db) override {
    DatabaseManager::getQueryExecutor(db).removeAllThreadActivityEntries();
  }
};

} // namespace comm
