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

  virtual void execute(std::string db) override {
    DatabaseManager::getQueryExecutor(db).removeThreads(this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceThreadOperation : public DBOperationBase {
public:
  ReplaceThreadOperation(Thread &&thread) : thread{std::move(thread)} {
  }

  virtual void execute(std::string db) override {
    DatabaseManager::getQueryExecutor(db).replaceThread(this->thread);
  }

private:
  Thread thread;
};

class RemoveAllThreadsOperation : public DBOperationBase {
public:
  virtual void execute(std::string db) override {
    DatabaseManager::getQueryExecutor(db).removeAllThreads();
  }
};

} // namespace comm
