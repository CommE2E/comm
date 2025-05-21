#pragma once

#include "../DatabaseManagers/entities/EntryInfo.h"
#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {
class RemoveEntriesOperation : public DBOperationBase {
public:
  RemoveEntriesOperation(std::vector<std::string> ids) : ids{ids} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeEntries(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceEntryOperation : public DBOperationBase {
public:
  ReplaceEntryOperation(EntryInfo &&entry) : entry{std::move(entry)} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).replaceEntry(this->entry);
  }

private:
  EntryInfo entry;
};

class RemoveAllEntriesOperation : public DBOperationBase {
public:
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeAllEntries();
  }
};

} // namespace comm
