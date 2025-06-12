#pragma once

#include "../DatabaseManagers/entities/Media.h"
#include "../DatabaseManagers/entities/Thread.h"
#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {

class RemoveThreadsOperation : public DBOperationBase {
public:
  RemoveThreadsOperation(std::vector<std::string> ids) : ids{ids} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeThreads(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceThreadOperation : public DBOperationBase {
public:
  ReplaceThreadOperation(Thread &&thread) : thread{std::move(thread)} {
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).replaceThread(this->thread, false);
  }

private:
  Thread thread;
};

class RemoveAllThreadsOperation : public DBOperationBase {
public:
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeAllThreads();
  }
};

} // namespace comm
