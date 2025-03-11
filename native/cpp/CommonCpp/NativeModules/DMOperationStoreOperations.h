#pragma once

#include "../DatabaseManagers/entities/DMOperation.h"
#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {
class RemoveDMOperationsOperation : public DBOperationBase {
public:
  RemoveDMOperationsOperation(std::vector<std::string> ids) : ids{ids} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeDMOperations(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceDMOperationOperation : public DBOperationBase {
public:
  ReplaceDMOperationOperation(DMOperation &&operation)
      : operation{std::move(operation)} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().replaceDMOperation(this->operation);
  }

private:
  DMOperation operation;
};

class RemoveAllDMOperationsOperation : public DBOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllDMOperations();
  }
};

} // namespace comm
