#pragma once

#include "../DatabaseManagers/entities/SyncedMetadataEntry.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {

class SyncedMetadataStoreOperationBase {
public:
  virtual void execute() = 0;
  virtual ~SyncedMetadataStoreOperationBase(){};
};

class RemoveSyncedMetadataOperation : public SyncedMetadataStoreOperationBase {
public:
  RemoveSyncedMetadataOperation(std::vector<std::string> names) : names{names} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeSyncedMetadata(this->names);
  }

private:
  std::vector<std::string> names;
};

class ReplaceSyncedMetadataOperation : public SyncedMetadataStoreOperationBase {
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

class RemoveAllSyncedMetadataOperation
    : public SyncedMetadataStoreOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllSyncedMetadata();
  }
};

} // namespace comm
