#pragma once

#include "../DatabaseManagers/entities/SyncedMetadataEntry.h"
#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {

class RemoveSyncedMetadataOperation : public DBOperationBase {
public:
  RemoveSyncedMetadataOperation(std::vector<std::string> names) : names{names} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeSyncedMetadata(this->names);
  }

private:
  std::vector<std::string> names;
};

class ReplaceSyncedMetadataOperation : public DBOperationBase {
public:
  ReplaceSyncedMetadataOperation(SyncedMetadataEntry &&syncedMetadataEntry)
      : syncedMetadataEntry{std::move(syncedMetadataEntry)} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().replaceSyncedMetadataEntry(
        this->syncedMetadataEntry);
  }

private:
  SyncedMetadataEntry syncedMetadataEntry;
};

class RemoveAllSyncedMetadataOperation : public DBOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllSyncedMetadata();
  }
};

} // namespace comm
