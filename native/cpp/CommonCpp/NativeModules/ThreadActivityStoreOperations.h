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

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeThreadActivityEntries(
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

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).replaceThreadActivityEntry(
        this->threadActivityEntry);
  }

private:
  ThreadActivityEntry threadActivityEntry;
};

class RemoveAllThreadActivityEntriesOperation : public DBOperationBase {
public:
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeAllThreadActivityEntries();
  }
};

} // namespace comm
