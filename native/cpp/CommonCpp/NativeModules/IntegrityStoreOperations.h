#pragma once

#include "../DatabaseManagers/entities/IntegrityThreadHash.h"
#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {

class RemoveIntegrityThreadHashesOperation : public DBOperationBase {
public:
  RemoveIntegrityThreadHashesOperation(std::vector<std::string> ids)
      : ids{ids} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeIntegrityThreadHashes(
        this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceIntegrityThreadHashesOperation : public DBOperationBase {
public:
  ReplaceIntegrityThreadHashesOperation(
      std::vector<IntegrityThreadHash> &&threadHashes)
      : threadHashes{std::move(threadHashes)} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).replaceIntegrityThreadHashes(
        this->threadHashes);
  }

private:
  std::vector<IntegrityThreadHash> threadHashes;
};

class RemoveAllIntegrityThreadHashesOperation : public DBOperationBase {
public:
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeAllIntegrityThreadHashes();
  }
};

} // namespace comm
