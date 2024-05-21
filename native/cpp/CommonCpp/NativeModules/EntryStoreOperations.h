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

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeEntries(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceEntryOperation : public DBOperationBase {
public:
  ReplaceEntryOperation(EntryInfo &&entry) : entry{std::move(entry)} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().replaceEntry(this->entry);
  }

private:
  EntryInfo entry;
};

class RemoveAllEntriesOperation : public DBOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllEntries();
  }
};

} // namespace comm
