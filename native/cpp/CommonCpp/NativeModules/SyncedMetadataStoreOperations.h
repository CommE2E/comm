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

  virtual void execute(DatabaseIdentifier id) override {
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

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).replaceSyncedMetadataEntry(
        this->syncedMetadataEntry);
  }

private:
  SyncedMetadataEntry syncedMetadataEntry;
};

class RemoveAllSyncedMetadataOperation : public DBOperationBase {
public:
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeAllSyncedMetadata();
  }
};

} // namespace comm
