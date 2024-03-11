#pragma once

#include "../DatabaseManagers/entities/IntegrityThreadHash.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {
class IntegrityStoreOperationBase {
public:
  virtual void execute() = 0;
  virtual ~IntegrityStoreOperationBase(){};
};

class RemoveIntegrityThreadHashesOperation
    : public IntegrityStoreOperationBase {
public:
  RemoveIntegrityThreadHashesOperation(std::vector<std::string> ids)
      : ids{ids} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeIntegrityThreadHashes(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceIntegrityThreadHashesOperation
    : public IntegrityStoreOperationBase {
public:
  ReplaceIntegrityThreadHashesOperation(
      std::vector<IntegrityThreadHash> &&threadHashes)
      : threadHashes{std::move(threadHashes)} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().replaceIntegrityThreadHashes(
        this->threadHashes);
  }

private:
  std::vector<IntegrityThreadHash> threadHashes;
};

class RemoveAllIntegrityThreadHashesOperation
    : public IntegrityStoreOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllIntegrityThreadHashes();
  }
};

} // namespace comm
