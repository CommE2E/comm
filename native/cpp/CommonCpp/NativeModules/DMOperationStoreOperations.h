#pragma once

#include "../DatabaseManagers/entities/DMOperation.h"
#include "../DatabaseManagers/entities/QueuedDMOperation.h"
#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {
class RemoveDMOperationsOperation : public DBOperationBase {
public:
  RemoveDMOperationsOperation(std::vector<std::string> ids) : ids{ids} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeDMOperations(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceDMOperationOperation : public DBOperationBase {
public:
  ReplaceDMOperationOperation(DMOperation &&operation)
      : operation{std::move(operation)} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).replaceDMOperation(this->operation);
  }

private:
  DMOperation operation;
};

class RemoveAllDMOperationsOperation : public DBOperationBase {
public:
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeAllDMOperations();
  }
};
class AddQueuedDMOperationOperation : public DBOperationBase {
public:
  AddQueuedDMOperationOperation(QueuedDMOperation &&operation)
      : operation{std::move(operation)} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).addQueuedDMOperation(this->operation);
  }

private:
  QueuedDMOperation operation;
};

class ClearQueuedDMOperationsOperation : public DBOperationBase {
public:
  ClearQueuedDMOperationsOperation(std::string queueType, std::string queueKey)
      : queueType{queueType}, queueKey{queueKey} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).clearQueuedDMOperations(
        this->queueType, this->queueKey);
  }

private:
  std::string queueType;
  std::string queueKey;
};

class PruneQueuedDMOperationsOperation : public DBOperationBase {
public:
  PruneQueuedDMOperationsOperation(std::string timestamp)
      : timestamp{timestamp} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeQueuedDMOperationsOlderThan(
        this->timestamp);
  }

private:
  std::string timestamp;
};

} // namespace comm
